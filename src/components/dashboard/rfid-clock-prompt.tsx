"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  Nfc,
  LogIn,
  LogOut,
  Loader2,
  WifiOff,
  ScanLine,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInHours } from "date-fns";
import { supabase } from "@/lib/supabaseClient";

// Interfaces
interface ClockEmployeeInfo {
  id: string;
  name: string;
}

interface AttendanceRecord {
  id: string;
  employee_id: string;
  clock_in_time: string;
  clock_out_time: string | null;
  status: "clocked_in" | "clocked_out";
  created_at: string;
}

interface RfidTag {
  rfid_tag: string;
}

// Placeholder for unregistered tag
const UNREGISTERED_TEST_TAG = "UNREGISTERED_TEST_TAG";

// Helper to safely stringify objects
function safeStringify(obj: any): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (err) {
    return `[Object cannot be stringified: ${(err as Error).message}]`;
  }
}

// Fetch employee by RFID tag
async function fetchEmployeeByRfidFromSupabase(
  rfidTag: string,
  signal?: AbortSignal,
): Promise<ClockEmployeeInfo | null> {
  console.log(`Fetching employee with RFID tag: ${rfidTag}`);
  try {
    const response = await supabase
      .from("employees")
      .select("id, name")
      .eq("rfid_tag", rfidTag)
      .maybeSingle();

    console.log(
      "Supabase response:",
      safeStringify({
        status: response.status,
        error: response.error ? response.error.message : "No error",
      }),
    );

    if (response.error) {
      console.error("Supabase error:", response.error.message);
      return null;
    }

    return response.data
      ? { id: response.data.id, name: response.data.name }
      : null;
  } catch (error) {
    console.error(
      "Unexpected error in fetchEmployeeByRfid:",
      (error as Error).message,
    );
    return null;
  }
}

// Fetch last attendance record
async function fetchLastAttendanceRecord(
  employeeId: string,
  signal?: AbortSignal,
): Promise<AttendanceRecord | null> {
  console.log(`Fetching attendance for employee ID: ${employeeId}`);
  try {
    const response = await supabase
      .from("attendance_records")
      .select("*")
      .eq("employee_id", employeeId)
      .order("clock_in_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log(
      "Attendance response:",
      safeStringify({
        status: response.status,
        error: response.error ? response.error.message : "No error",
      }),
    );

    if (response.error) {
      console.error("Error fetching attendance:", response.error.message);
      return null;
    }

    return response.data;
  } catch (error) {
    console.error(
      "Unexpected error in fetchLastAttendance:",
      (error as Error).message,
    );
    return null;
  }
}

// Fetch RFID tags for testing
async function fetchTestRfidTags(): Promise<RfidTag[]> {
  console.log("Fetching RFID tags for testing");
  try {
    const response = await supabase
      .from("employees")
      .select("rfid_tag")
      .not("rfid_tag", "is", null);

    console.log(
      "RFID tags response:",
      safeStringify({
        status: response.status,
        error: response.error ? response.error.message : "No error",
      }),
    );

    if (response.error) {
      console.error("Error fetching RFID tags:", response.error.message);
      return [];
    }

    return response.data || [];
  } catch (error) {
    console.error(
      "Unexpected error in fetchTestRfidTags:",
      (error as Error).message,
    );
    return [];
  }
}

// Record clock event
async function recordClockEventSupabase(
  employeeId: string,
  eventType: "in" | "out",
): Promise<{ success: boolean; eventTime: Date; message?: string }> {
  const eventTime = new Date();
  console.log(`Recording clock ${eventType} for employee ID: ${employeeId}`);
  try {
    const lastRecord = await fetchLastAttendanceRecord(employeeId);

    if (eventType === "in") {
      if (
        lastRecord &&
        lastRecord.status === "clocked_in" &&
        !lastRecord.clock_out_time
      ) {
        return {
          success: false,
          eventTime,
          message: "You are already clocked in.",
        };
      }

      const response = await supabase.from("attendance_records").insert({
        employee_id: employeeId,
        clock_in_time: eventTime.toISOString(),
        status: "clocked_in",
      });

      if (response.error) {
        console.error("Error inserting clock-in:", response.error.message);
        return { success: false, eventTime, message: response.error.message };
      }
    } else {
      if (
        !lastRecord ||
        lastRecord.status === "clocked_out" ||
        !lastRecord.clock_in_time
      ) {
        return {
          success: false,
          eventTime,
          message: "You are not clocked in or record is incomplete.",
        };
      }

      const response = await supabase
        .from("attendance_records")
        .update({
          clock_out_time: eventTime.toISOString(),
          status: "clocked_out",
        })
        .eq("id", lastRecord.id);

      if (response.error) {
        console.error("Error updating clock-out:", response.error.message);
        return { success: false, eventTime, message: response.error.message };
      }
    }

    console.log(`Successfully recorded clock ${eventType}`);
    return { success: true, eventTime };
  } catch (error) {
    console.error(
      `Unexpected error in clock ${eventType}:`,
      (error as Error).message,
    );
    return {
      success: false,
      eventTime,
      message: (error as Error).message || "An unexpected error occurred",
    };
  }
}

// Generate attendance report
async function generateAttendanceReport(): Promise<string> {
  try {
    const { data: records, error } = await supabase
      .from("attendance_records")
      .select(
        "id, employee_id, clock_in_time, clock_out_time, created_at, employees(name)",
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching attendance records:", error.message);
      return "Error: Could not fetch attendance records.";
    }

    if (!records || records.length === 0) {
      return "No attendance records found.";
    }

    const headers = [
      "Employee ID",
      "Name",
      "Clock In",
      "Clock Out",
      "Duration (Hours)",
      "Date",
    ];
    const rows = await Promise.all(
      records.map(async (record) => {
        const clockIn = record.clock_in_time
          ? new Date(record.clock_in_time)
          : null;
        const clockOut = record.clock_out_time
          ? new Date(record.clock_out_time)
          : null;
        const duration =
          clockIn && clockOut
            ? differenceInHours(clockOut, clockIn).toString()
            : "N/A";
        const date = record.created_at
          ? format(new Date(record.created_at), "yyyy-MM-dd")
          : "N/A";
        const name = record.employees?.name || "Unknown";

        return [
          record.employee_id,
          name,
          clockIn ? format(clockIn, "PPpp") : "N/A",
          clockOut ? format(clockOut, "PPpp") : "N/A",
          duration,
          date,
        ]
          .map((field) => `"${field}"`)
          .join(",");
      }),
    );

    return [headers.join(","), ...rows].join("\n");
  } catch (error) {
    console.error(
      "Error generating attendance report:",
      (error as Error).message,
    );
    return "Error: Failed to generate attendance report.";
  }
}

// Generate anomaly report
async function generateAnomalyReport(): Promise<string> {
  try {
    const { data: records, error } = await supabase
      .from("attendance_records")
      .select(
        "id, employee_id, clock_in_time, clock_out_time, status, created_at, employees(name)",
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching attendance for anomalies:", error.message);
      return "Error: Could not fetch attendance records.";
    }

    if (!records || records.length === 0) {
      return "No attendance records found, hence no anomalies.";
    }

    const anomalies: string[] = [];
    for (const record of records) {
      const name = record.employees?.name || "Unknown";
      if (record.status === "clocked_in" && !record.clock_out_time) {
        anomalies.push(
          [
            record.employee_id,
            name,
            "Missing Clock-Out",
            record.clock_in_time
              ? format(new Date(record.clock_in_time), "PPpp")
              : "N/A",
            "Employee clocked in but no clock-out recorded.",
          ]
            .map((field) => `"${field}"`)
            .join(","),
        );
      }
    }

    const headers = [
      "Employee ID",
      "Name",
      "Anomaly Type",
      "Timestamp",
      "Details",
    ];
    if (anomalies.length === 0) {
      return "No anomalies detected.";
    }

    return [headers.join(","), ...anomalies].join("\n");
  } catch (error) {
    console.error("Error generating anomaly report:", (error as Error).message);
    return "Error: Failed to generate anomaly report.";
  }
}

// Download CSV file
function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Global RFID listeners
const rfidListeners: Set<(tag: string) => void> = new Set();

// Simulate RFID scan
function simulateRfidScan(tag: string) {
  console.log(`Simulating RFID scan with tag: ${tag}`);
  rfidListeners.forEach((listener) => listener(tag));
}

export function RfidClockPrompt() {
  const [isListening] = useState<boolean>(true);
  const [scannedTag, setScannedTag] = useState<string | null>(null);
  const [employeeInfo, setEmployeeInfo] = useState<
    (ClockEmployeeInfo & { currentStatus?: AttendanceRecord }) | null
  >(null);
  const [isLoadingEmployee, setIsLoadingEmployee] = useState<boolean>(false);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [isSubmittingClockAction, setIsSubmittingClockAction] =
    useState<boolean>(false);
  const [isOnline, setIsOnline] = useState(true);
  const [testRfidTags, setTestRfidTags] = useState<RfidTag[]>([]);
  const { toast } = useToast();

  const scanAbortControllerRef = useRef<AbortController | null>(null);
  const actionTypeRef = useRef<"in" | "out" | null>(null);
  const isProcessingScan = useRef<boolean>(false);
  const [debugInfo, setDebugInfo] = useState<string>("Component mounted");

  // Check online status
  useEffect(() => {
    const updateOnlineStatus = () => {
      const status = navigator.onLine;
      console.log(`Network status: ${status ? "Online" : "Offline"}`);
      setIsOnline(status);
    };

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    updateOnlineStatus();

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  // Fetch RFID tags on mount
  useEffect(() => {
    async function loadTestRfidTags() {
      const tags = await fetchTestRfidTags();
      if (tags.length === 0) {
        toast({
          title: "No RFID Tags Found",
          description:
            "No employees with RFID tags in the database. Test scans disabled.",
          variant: "destructive",
          duration: 7000,
        });
      }
      setTestRfidTags(tags);
    }
    loadTestRfidTags();
  }, [toast]);

  // Reset state
  const resetState = useCallback(() => {
    console.log("Resetting component state");
    setShowPrompt(false);
    setEmployeeInfo(null);
    setScannedTag(null);
    setIsLoadingEmployee(false);
    setIsSubmittingClockAction(false);
    isProcessingScan.current = false;

    if (scanAbortControllerRef.current) {
      scanAbortControllerRef.current.abort();
      scanAbortControllerRef.current = null;
    }
  }, []);

  // Handle RFID scan
  const handleScan = useCallback(
    async (tagId: string) => {
      if (isProcessingScan.current) {
        console.log("Scan ignored: already processing.");
        setDebugInfo("Scan ignored: already processing");
        return;
      }

      isProcessingScan.current = true;
      console.log(`Handling RFID scan: ${tagId}`);
      setDebugInfo(`Scan received: ${tagId}`);

      setScannedTag(tagId);
      setIsLoadingEmployee(true);

      try {
        scanAbortControllerRef.current = new AbortController();
        const employee = await fetchEmployeeByRfidFromSupabase(
          tagId,
          scanAbortControllerRef.current.signal,
        );

        if (scanAbortControllerRef.current?.signal.aborted) {
          console.log("Scan aborted");
          setDebugInfo("Scan aborted");
          return;
        }

        if (employee) {
          console.log(`Employee found: ${employee.name}`);
          setDebugInfo(`Employee found: ${employee.name}`);

          const lastRecord = await fetchLastAttendanceRecord(
            employee.id,
            scanAbortControllerRef.current.signal,
          );

          if (scanAbortControllerRef.current?.signal.aborted) {
            console.log("Scan aborted during attendance check");
            return;
          }

          setEmployeeInfo({
            ...employee,
            currentStatus: lastRecord || undefined,
          });
          setShowPrompt(true);
          setIsLoadingEmployee(false);
        } else {
          console.log(`Unknown RFID tag: ${tagId}`);
          setDebugInfo(`Unknown tag: ${tagId}`);

          toast({
            title: "Unknown RFID Tag",
            description: `Tag ID "${tagId}" is not registered.`,
            variant: "destructive",
            duration: 7000,
          });
          resetState();
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Error in handleScan:", (error as Error).message);
          setDebugInfo(`Scan error: ${(error as Error).message}`);

          toast({
            title: "Scan Error",
            description: "Could not verify RFID tag. Try again.",
            variant: "destructive",
          });
          resetState();
        }
      } finally {
        if (!scanAbortControllerRef.current?.signal.aborted) {
          isProcessingScan.current = false;
          setIsLoadingEmployee(false);
        }
        scanAbortControllerRef.current = null;
      }
    },
    [toast, resetState],
  );

  // Set up RFID listener
  useEffect(() => {
    console.log("Setting up RFID listener");
    const listener = (tag: string) => {
      console.log(`RFID listener received: ${tag}`);
      handleScan(tag);
    };

    rfidListeners.add(listener);

    return () => {
      console.log("Cleaning up RFID listener");
      rfidListeners.delete(listener);
      if (scanAbortControllerRef.current) {
        scanAbortControllerRef.current.abort();
        scanAbortControllerRef.current = null;
      }
    };
  }, [handleScan]);

  // Handle clock actions
  const handleClockAction = async (actionType: "in" | "out") => {
    if (!employeeInfo || isSubmittingClockAction) {
      console.log("Cannot perform clock action: invalid state");
      return;
    }

    console.log(`Initiating clock ${actionType} for ${employeeInfo.name}`);
    setDebugInfo(`Clocking ${actionType}: ${employeeInfo.name}`);

    actionTypeRef.current = actionType;
    setIsSubmittingClockAction(true);

    try {
      const result = await recordClockEventSupabase(
        employeeInfo.id,
        actionType,
      );

      if (result.success) {
        console.log(`Successfully clocked ${actionType}`);
        setDebugInfo(`Clocked ${actionType} success`);

        toast({
          title: `Clocked ${actionType === "in" ? "In" : "Out"} Successfully`,
          description: `${employeeInfo.name} at ${format(result.eventTime, "PPpp")}`,
          duration: 5000,
        });
      } else {
        throw new Error(result.message || `Clock ${actionType} failed.`);
      }
    } catch (error) {
      console.error(`Failed to clock ${actionType}:`, (error as Error).message);
      setDebugInfo(`Clock ${actionType} error: ${(error as Error).message}`);

      toast({
        title: `Clock ${actionType === "in" ? "In" : "Out"} Failed`,
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      resetState();
    }
  };

  // Handle report generation
  const handleGenerateReport = async (reportType: "attendance" | "anomaly") => {
    try {
      let content: string;
      let filename: string;

      if (reportType === "attendance") {
        content = await generateAttendanceReport();
        filename = `attendance_report_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`;
      } else {
        content = await generateAnomalyReport();
        filename = `anomaly_report_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`;
      }

      if (
        content.startsWith("Error") ||
        content.includes("No attendance records")
      ) {
        toast({
          title: `${reportType === "attendance" ? "Attendance" : "Anomaly"} Report`,
          description: content,
          variant: "default",
          duration: 7000,
        });
      } else {
        downloadCsv(content, filename);
        toast({
          title: `${reportType === "attendance" ? "Attendance" : "Anomaly"} Report Generated`,
          description: `Downloaded as ${filename}`,
          duration: 5000,
        });
      }
    } catch (error) {
      console.error(
        `Error generating ${reportType} report:`,
        (error as Error).message,
      );
      toast({
        title: "Report Error",
        description: `Failed to generate ${reportType} report.`,
        variant: "destructive",
      });
    }
  };

  // Trigger test scan
  const triggerTestScan = (
    tagType: "registered" | "unregistered" | "random_registered",
  ) => {
    if (testRfidTags.length === 0 && tagType !== "unregistered") {
      toast({
        title: "No RFID Tags Available",
        description: "No employees with RFID tags found for testing.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    let tagToScan = UNREGISTERED_TEST_TAG;
    if (tagType === "registered") {
      tagToScan = testRfidTags[0].rfid_tag;
    } else if (tagType === "random_registered") {
      const randomIndex = Math.floor(Math.random() * testRfidTags.length);
      tagToScan = testRfidTags[randomIndex].rfid_tag;
    }

    console.log(`Triggering test scan: ${tagType} - ${tagToScan}`);
    setDebugInfo(`Test scan: ${tagType} - ${tagToScan}`);

    simulateRfidScan(tagToScan);

    toast({
      title: "Test Scan Triggered",
      description: `Simulating scan with ${tagType} tag: ${tagToScan}.`,
      duration: 3000,
    });
  };

  // Display values
  const isEmployeeClockedIn =
    employeeInfo?.currentStatus?.status === "clocked_in" &&
    !employeeInfo?.currentStatus?.clock_out_time;
  const lastEventDisplayTime = employeeInfo?.currentStatus?.clock_in_time
    ? format(new Date(employeeInfo.currentStatus.clock_in_time), "p")
    : "N/A";

  return (
    <Card className="relative min-h-[300px] shadow-lg glass-effect flex flex-col">
      {process.env.NODE_ENV !== "production" && (
        <div className="absolute top-0 right-0 bg-black/80 text-white text-xs p-1 z-50 max-w-[200px] overflow-hidden">
          <p className="truncate">Debug: {debugInfo}</p>
        </div>
      )}

      {isLoadingEmployee && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg z-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-muted-foreground">
            Verifying RFID Tag: {scannedTag}...
          </p>
        </div>
      )}

      <CardContent className="flex flex-col items-center space-y-4 p-6 text-center justify-center flex-grow">
        <Nfc
          className={`h-16 w-16 ${isListening && !isLoadingEmployee ? "text-primary animate-pulse" : "text-muted-foreground"}`}
        />
        <p className="text-xl font-semibold text-foreground">
          Ready for RFID Scan
        </p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Present your employee badge to the RFID reader.
        </p>

        {!isOnline && (
          <div className="mt-2 text-xs text-destructive flex items-center gap-1">
            <WifiOff className="h-4 w-4" />
            <span>Offline Mode: Clocking may be limited.</span>
          </div>
        )}

        <div className="mt-3 space-y-2 w-full max-w-xs">
          <p className="text-xs text-muted-foreground">For Demonstration:</p>
          <Button
            onClick={() => triggerTestScan("random_registered")}
            variant="outline"
            size="sm"
            className="w-full"
            disabled={
              isLoadingEmployee || showPrompt || testRfidTags.length === 0
            }
          >
            <ScanLine className="mr-2 h-4 w-4" /> Simulate Random Registered Tag
          </Button>
          <Button
            onClick={() => triggerTestScan("registered")}
            variant="outline"
            size="sm"
            className="w-full"
            disabled={
              isLoadingEmployee || showPrompt || testRfidTags.length === 0
            }
          >
            <ScanLine className="mr-2 h-4 w-4" /> Simulate Registered Tag
          </Button>
          <Button
            onClick={() => triggerTestScan("unregistered")}
            variant="outline"
            size="sm"
            className="w-full"
            disabled={isLoadingEmployee || showPrompt}
          >
            <ScanLine className="mr-2 h-4 w-4 text-destructive" /> Simulate
            Unregistered Tag
          </Button>
          <Button
            onClick={() => handleGenerateReport("attendance")}
            variant="outline"
            size="sm"
            className="w-full"
            disabled={isLoadingEmployee || showPrompt}
          >
            <Download className="mr-2 h-4 w-4" /> Generate Attendance Report
          </Button>
          <Button
            onClick={() => handleGenerateReport("anomaly")}
            variant="outline"
            size="sm"
            className="w-full"
            disabled={isLoadingEmployee || showPrompt}
          >
            <Download className="mr-2 h-4 w-4" /> Generate Anomaly Report
          </Button>
        </div>
      </CardContent>

      <Dialog
        open={showPrompt && !!employeeInfo && !isLoadingEmployee}
        onOpenChange={(open) => {
          if (!open) resetState();
        }}
      >
        <DialogContent className="glass-effect sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clock Action: {employeeInfo?.name}</DialogTitle>
            <DialogDescription>
              RFID Tag:{" "}
              <span className="font-semibold text-primary">{scannedTag}</span>
              <br />
              Current Status:{" "}
              {isEmployeeClockedIn
                ? `Clocked In since ${lastEventDisplayTime}`
                : "Clocked Out"}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="flex justify-around gap-4">
              <Button
                onClick={() => handleClockAction("in")}
                disabled={isEmployeeClockedIn || isSubmittingClockAction}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white text-base py-3"
              >
                {isSubmittingClockAction && actionTypeRef.current === "in" ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-5 w-5" />
                )}
                Clock In
              </Button>
              <Button
                onClick={() => handleClockAction("out")}
                disabled={!isEmployeeClockedIn || isSubmittingClockAction}
                className="flex-1 text-base py-3"
                variant="destructive"
              >
                {isSubmittingClockAction && actionTypeRef.current === "out" ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-5 w-5" />
                )}
                Clock Out
              </Button>
            </div>

            {isSubmittingClockAction && (
              <div className="flex items-center justify-center text-sm text-muted-foreground pt-2">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
