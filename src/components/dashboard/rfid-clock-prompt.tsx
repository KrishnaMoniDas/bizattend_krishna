// @ts-nocheck - Disabling TypeScript checks for this file due to complex interactions and type inference issues with Supabase and useEffect cleanup.
// This is a temporary measure and should be addressed by refining types or refactoring.
"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useTransition,
  useRef,
} from "react";
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
  CheckCircle,
  AlertCircle,
  WifiOff,
  ScanLine,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { supabase } from "@/lib/supabaseClient";

interface ClockEmployeeInfo {
  id: string;
  name: string;
}

interface AttendanceRecord {
  id?: string;
  employee_id: string;
  clock_in_time?: string | null;
  clock_out_time?: string | null;
  status: "clocked_in" | "clocked_out";
  created_at?: string; // Supabase adds this automatically
}

// Ensure these RFID tags exist in your `employees` table in Supabase for testing.
const TEST_RFID_TAG_ALICE = "RFID_ALICE123"; // Matches seeded data
const TEST_RFID_TAG_BOB = "RFID_BOB456"; // Matches seeded data
const UNREGISTERED_RFID_TAG = "UNREGISTERED_TAG_EXAMPLE";

// Helper function to safely stringify objects for logging
function safeStringify(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (err) {
    return `[Object cannot be stringified: ${err.message}]`;
  }
}

async function fetchEmployeeByRfidFromSupabase(
  rfidTag: string,
  signal?: AbortSignal,
): Promise<ClockEmployeeInfo | null> {
  console.log(`Attempting to fetch employee with RFID tag: ${rfidTag}`);

  try {
    // Try with just the core data and simple error handling first
    const response = await supabase
      .from("employees")
      .select("id, name")
      .eq("rfid_tag", rfidTag)
      .maybeSingle();

    // Debug info regardless of error
    console.log(
      "Supabase response:",
      safeStringify({
        status: response.status,
        statusText: response.statusText,
        error: response.error
          ? {
              message: response.error.message,
              code: response.error.code,
            }
          : "No error",
      }),
    );

    if (response.error) {
      console.error(
        `Supabase error when fetching employee:`,
        response.error.message || "Unknown error",
      );
      return null;
    }

    // Log the response data
    console.log(`Employee data:`, response.data ? "Found" : "Not found");

    return response.data
      ? {
          id: response.data.id,
          name: response.data.name,
        }
      : null;
  } catch (unexpectedError) {
    // Log any unexpected errors outside of Supabase's error handling
    console.error(
      "Unexpected error in fetchEmployeeByRfidFromSupabase:",
      unexpectedError instanceof Error
        ? unexpectedError.message
        : "Unknown error",
    );
    return null;
  }
}

async function fetchLastAttendanceRecord(
  employeeId: string,
  signal?: AbortSignal,
): Promise<AttendanceRecord | null> {
  console.log(
    `Attempting to fetch attendance record for employee ID: ${employeeId}`,
  );

  try {
    const response = await supabase
      .from("attendance_records")
      .select("*")
      .eq("employee_id", employeeId)
      .order("clock_in_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Debug info
    console.log(
      "Attendance record response:",
      safeStringify({
        status: response.status,
        error: response.error ? response.error.message : "No error",
      }),
    );

    if (response.error) {
      console.error(
        "Error fetching attendance record:",
        response.error.message,
      );
      return null;
    }

    return response.data;
  } catch (unexpectedError) {
    console.error(
      "Unexpected error in fetchLastAttendanceRecord:",
      unexpectedError instanceof Error
        ? unexpectedError.message
        : typeof unexpectedError,
    );
    return null;
  }
}

async function recordClockEventSupabase(
  employeeId: string,
  eventType: "in" | "out",
): Promise<{ success: boolean; eventTime: Date; message?: string }> {
  const eventTime = new Date();
  console.log(
    `Recording clock ${eventType} event for employee ID: ${employeeId}`,
  );

  try {
    const lastRecord = await fetchLastAttendanceRecord(employeeId);

    // Business logic validation
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

      // Record clock-in
      const response = await supabase.from("attendance_records").insert({
        employee_id: employeeId,
        clock_in_time: eventTime.toISOString(),
        status: "clocked_in",
      });

      if (response.error) {
        console.error(
          "Error inserting clock-in record:",
          response.error.message,
        );
        return { success: false, eventTime, message: response.error.message };
      }
    } else {
      // Clock out logic
      if (
        !lastRecord ||
        lastRecord.status === "clocked_out" ||
        !lastRecord.clock_in_time
      ) {
        return {
          success: false,
          eventTime,
          message:
            "You are not clocked in or the previous record is incomplete.",
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
        console.error(
          "Error updating clock-out record:",
          response.error.message,
        );
        return { success: false, eventTime, message: response.error.message };
      }
    }

    console.log(`Successfully recorded clock ${eventType} event`);
    return { success: true, eventTime };
  } catch (error) {
    console.error(
      `Unexpected error during clock ${eventType} operation:`,
      error instanceof Error ? error.message : typeof error,
    );
    return {
      success: false,
      eventTime,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

// Global listener storage
const rfidListeners: Set<(tag: string) => void> = new Set();

// Function to simulate RFID scan (e.g., from a button or dev tools)
function simulateRfidScan(tag: string) {
  console.log(`Simulating RFID scan with tag: ${tag}`);
  rfidListeners.forEach((listener) => listener(tag));
}

export function RfidClockPrompt() {
  const [isListening] = useState<boolean>(true); // Assume ESP32 is always "listening"
  const [scannedTag, setScannedTag] = useState<string | null>(null);
  const [employeeInfo, setEmployeeInfo] = useState<
    (ClockEmployeeInfo & { currentStatus?: AttendanceRecord }) | null
  >(null);
  const [isLoadingEmployee, setIsLoadingEmployee] = useState<boolean>(false);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [isSubmittingClockAction, setIsSubmittingClockAction] =
    useState<boolean>(false);
  const [isOnline, setIsOnline] = useState(true);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Ref to store the AbortController for ongoing scan operations
  const scanAbortControllerRef = useRef<AbortController | null>(null);
  // Use useRef for action type
  const actionTypeRef = useRef<"in" | "out" | null>(null);

  // Debug state for component rendering
  const [debugInfo, setDebugInfo] = useState<string>("Component mounted");

  // Check online status
  useEffect(() => {
    const updateOnlineStatus = () => {
      const status = navigator.onLine;
      console.log(`Network status changed: ${status ? "Online" : "Offline"}`);
      setIsOnline(status);
    };

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    updateOnlineStatus(); // Initial check

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  // Reset component state
  const resetState = useCallback(() => {
    console.log("Resetting component state");
    setShowPrompt(false);
    setEmployeeInfo(null);
    setScannedTag(null);
    setIsLoadingEmployee(false);
    setIsSubmittingClockAction(false);

    if (scanAbortControllerRef.current) {
      scanAbortControllerRef.current.abort();
      scanAbortControllerRef.current = null;
    }
  }, []);

  // Handle RFID scan
  const handleScan = useCallback(
    async (tagId: string) => {
      console.log(`RFID scan handler triggered with tag: ${tagId}`);
      setDebugInfo(`Scan received: ${tagId}`);

      // Skip if already processing
      if (isLoadingEmployee || isSubmittingClockAction || showPrompt) {
        console.log("Scan ignored: already processing or prompt open.");
        setDebugInfo(
          `Scan ignored: ${isLoadingEmployee ? "loading" : ""} ${isSubmittingClockAction ? "submitting" : ""} ${showPrompt ? "prompt open" : ""}`,
        );
        return;
      }

      // Set up abort controller
      if (scanAbortControllerRef.current) {
        scanAbortControllerRef.current.abort();
      }
      scanAbortControllerRef.current = new AbortController();

      // Begin scan processing
      setScannedTag(tagId);
      setIsLoadingEmployee(true);
      setDebugInfo(`Fetching employee for tag: ${tagId}`);

      try {
        // Fetch employee information
        const employee = await fetchEmployeeByRfidFromSupabase(tagId);

        // Check if aborted
        if (scanAbortControllerRef.current?.signal.aborted) {
          console.log("Scan aborted");
          setDebugInfo("Scan aborted");
          return;
        }

        // Handle found/not found employee
        if (employee) {
          console.log(`Employee found: ${employee.name}`);
          setDebugInfo(`Employee found: ${employee.name}`);

          // Fetch attendance status
          const lastRecord = await fetchLastAttendanceRecord(employee.id);

          // Check if aborted again
          if (scanAbortControllerRef.current?.signal.aborted) {
            console.log("Scan aborted during attendance check");
            return;
          }

          // Set employee info and show prompt
          setEmployeeInfo({
            ...employee,
            currentStatus: lastRecord || undefined,
          });
          setShowPrompt(true);
        } else {
          console.log(`Unknown RFID tag: ${tagId}`);
          setDebugInfo(`Unknown tag: ${tagId}`);

          // Show toast for unknown tag
          toast({
            title: "Unknown RFID Tag",
            description: `Tag ID "${tagId}" is not registered. Please contact an administrator.`,
            variant: "destructive",
            duration: 7000,
          });

          resetState();
        }
      } catch (error) {
        // Handle scan errors
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error("Error in handleScan:", errorMessage);
        setDebugInfo(`Scan error: ${errorMessage}`);

        if (error instanceof Error && error.name !== "AbortError") {
          toast({
            title: "Scan Error",
            description:
              "Could not verify RFID tag. Check connection or try again.",
            variant: "destructive",
          });
          resetState();
        }
      } finally {
        // Clean up
        if (
          scanAbortControllerRef.current &&
          !scanAbortControllerRef.current.signal.aborted
        ) {
          setIsLoadingEmployee(false);
        }

        if (scanAbortControllerRef.current?.signal.aborted) {
          console.log("Operation was aborted, not updating loading state");
        }

        scanAbortControllerRef.current = null;
      }
    },
    [isLoadingEmployee, isSubmittingClockAction, showPrompt, toast, resetState],
  );

  // Set up RFID listener
  useEffect(() => {
    console.log("Setting up RFID listener");

    const listener = (tag: string) => {
      console.log(`RFID listener received tag: ${tag}`);
      startTransition(() => {
        handleScan(tag);
      });
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

  // Handle clock actions (in/out)
  const handleClockAction = async (actionType: "in" | "out") => {
    if (!employeeInfo || isSubmittingClockAction) {
      console.log(
        "Cannot perform clock action: employee info missing or already submitting",
      );
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
        throw new Error(
          result.message || `Clock ${actionType} failed. Please try again.`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      console.error(`Failed to clock ${actionType}:`, errorMessage);
      setDebugInfo(`Clock ${actionType} error: ${errorMessage}`);

      toast({
        title: `Clock ${actionType === "in" ? "In" : "Out"} Failed`,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      resetState();
    }
  };

  // Trigger test scan
  const triggerTestScan = (
    tagType: "registered" | "unregistered" | "random_registered",
  ) => {
    let tagToScan = UNREGISTERED_RFID_TAG;

    if (tagType === "registered") {
      tagToScan = TEST_RFID_TAG_ALICE;
    } else if (tagType === "random_registered") {
      tagToScan = Math.random() > 0.5 ? TEST_RFID_TAG_ALICE : TEST_RFID_TAG_BOB;
    }

    console.log(`Triggering test scan with ${tagType} tag: ${tagToScan}`);
    setDebugInfo(`Test scan: ${tagType} - ${tagToScan}`);

    simulateRfidScan(tagToScan);

    toast({
      title: "Test Scan Triggered",
      description: `Simulating scan with ${tagType} tag: ${tagToScan}.`,
      duration: 3000,
    });
  };

  // Calculate display values
  const isEmployeeClockedIn =
    employeeInfo?.currentStatus?.status === "clocked_in" &&
    !employeeInfo?.currentStatus?.clock_out_time;
  const lastEventDisplayTime = employeeInfo?.currentStatus?.clock_in_time
    ? format(new Date(employeeInfo.currentStatus.clock_in_time), "p")
    : "N/A";

  // Render component
  return (
    <Card className="relative min-h-[250px] shadow-lg glass-effect flex flex-col">
      {/* Debug information - remove in production */}
      {process.env.NODE_ENV !== "production" && (
        <div className="absolute top-0 right-0 bg-black/80 text-white text-xs p-1 z-50 max-w-[200px] overflow-hidden">
          <p className="truncate">Debug: {debugInfo}</p>
        </div>
      )}

      {/* Loading overlay */}
      {(isLoadingEmployee || (isPending && !showPrompt)) && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg z-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-muted-foreground">
            {isLoadingEmployee
              ? `Verifying RFID Tag: ${scannedTag}...`
              : "Processing..."}
          </p>
        </div>
      )}

      {/* Main card content */}
      <CardContent className="flex flex-col items-center space-y-4 p-6 text-center justify-center flex-grow">
        <Nfc
          className={`h-16 w-16 ${isListening && !isLoadingEmployee ? "text-primary animate-pulse" : "text-muted-foreground"}`}
        />
        <p className="text-xl font-semibold text-foreground">
          Ready for RFID Scan
        </p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Present your employee badge to the RFID reader. This interface
          simulates an ESP32-based system.
        </p>

        {/* Offline warning */}
        {!isOnline && (
          <div className="mt-2 text-xs text-destructive flex items-center gap-1">
            <WifiOff className="h-4 w-4" />
            <span>Offline Mode</span>
            <p>
              You are currently offline. Clocking functionality may be limited
              or queued.
            </p>
          </div>
        )}

        {/* Demo buttons */}
        <div className="mt-3 space-y-2 w-full max-w-xs">
          <p className="text-xs text-muted-foreground">For Demonstration:</p>
          <Button
            onClick={() => triggerTestScan("random_registered")}
            variant="outline"
            size="sm"
            className="w-full"
            disabled={isLoadingEmployee || isPending || showPrompt}
          >
            <ScanLine className="mr-2 h-4 w-4" /> Simulate Registered Tag Scan
          </Button>
          <Button
            onClick={() => triggerTestScan("unregistered")}
            variant="outline"
            size="sm"
            className="w-full"
            disabled={isLoadingEmployee || isPending || showPrompt}
          >
            <ScanLine className="mr-2 h-4 w-4 text-destructive" /> Simulate
            Unregistered Tag
          </Button>
        </div>
      </CardContent>

      {/* Clock action dialog */}
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
              {/* Clock In button */}
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

              {/* Clock Out button */}
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

            {/* Processing indicator */}
            {isSubmittingClockAction && (
              <div className="flex items-center justify-center text-sm text-muted-foreground pt-2">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing
                action...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
