"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Nfc, LogIn, LogOut, Loader2, ScanLine, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ClockEmployeeInfo {
  id: string;
  name: string;
  currentStatus?: {
    status: "clocked_in" | "clocked_out";
    clock_in_time?: string;
  };
}

// Global listener for RFID scan simulation
const rfidListeners = new Set<(tag: string) => void>();

// Function to simulate RFID scan (for demo purposes)
export function simulateRfidScan(tag: string) {
  rfidListeners.forEach((listener) => listener(tag));
}

// Predefined test RFID tags
const TEST_RFID_TAGS = {
  ALICE: "RFID_ALICE123",
  BOB: "RFID_BOB456",
  UNREGISTERED: "UNREGISTERED_TAG_EXAMPLE",
};

export function RfidClockPrompt() {
  const [isListening] = useState(true);
  const [scannedTag, setScannedTag] = useState<string | null>(null);
  const [employeeInfo, setEmployeeInfo] = useState<ClockEmployeeInfo | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionType, setActionType] = useState<"in" | "out" | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const { toast } = useToast();

  // Check online status
  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  // Reset component state
  const resetState = useCallback(() => {
    setShowPrompt(false);
    setEmployeeInfo(null);
    setScannedTag(null);
    setIsLoading(false);
    setIsSubmitting(false);
    setActionType(null);
  }, []);

  // Fetch employee by RFID tag
  const fetchEmployeeByRfid = useCallback(async (rfidTag: string) => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name")
        .eq("rfid_tag", rfidTag)
        .maybeSingle();

      if (error) throw error;

      if (!data) return null;

      // Fetch last attendance status
      const { data: lastRecord } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("employee_id", data.id)
        .order("clock_in_time", { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        id: data.id,
        name: data.name,
        currentStatus: lastRecord
          ? {
              status: lastRecord.status,
              clock_in_time: lastRecord.clock_in_time,
            }
          : undefined,
      };
    } catch (error) {
      console.error("Error fetching employee:", error);
      return null;
    }
  }, []);

  // Record clock event
  const recordClockEvent = useCallback(
    async (employeeId: string, eventType: "in" | "out") => {
      const eventTime = new Date();

      try {
        if (eventType === "in") {
          const { error } = await supabase.from("attendance_records").insert({
            employee_id: employeeId,
            clock_in_time: eventTime.toISOString(),
            status: "clocked_in",
          });

          if (error) throw error;
        } else {
          // Get the latest clock-in record
          const { data: lastRecord, error: fetchError } = await supabase
            .from("attendance_records")
            .select("id, status")
            .eq("employee_id", employeeId)
            .eq("status", "clocked_in")
            .order("clock_in_time", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (fetchError) throw fetchError;
          if (!lastRecord) throw new Error("No active clock-in record found");

          const { error: updateError } = await supabase
            .from("attendance_records")
            .update({
              clock_out_time: eventTime.toISOString(),
              status: "clocked_out",
            })
            .eq("id", lastRecord.id);

          if (updateError) throw updateError;
        }

        return { success: true, eventTime };
      } catch (error) {
        console.error(`Error recording clock ${eventType}:`, error);
        return {
          success: false,
          eventTime,
          message: error instanceof Error ? error.message : "An error occurred",
        };
      }
    },
    [],
  );

  // Handle RFID scan
  const handleScan = useCallback(
    async (tagId: string) => {
      // Skip if already processing
      if (isLoading || isSubmitting || showPrompt) return;

      setScannedTag(tagId);
      setIsLoading(true);

      try {
        const employee = await fetchEmployeeByRfid(tagId);

        if (employee) {
          setEmployeeInfo(employee);
          setShowPrompt(true);
        } else {
          toast({
            title: "Unknown RFID Tag",
            description: `Tag ID "${tagId}" is not registered. Please contact an administrator.`,
            variant: "destructive",
            duration: 5000,
          });
          resetState();
        }
      } catch (error) {
        console.error("Error in scan handler:", error);
        toast({
          title: "Scan Error",
          description: "Could not verify RFID tag. Please try again.",
          variant: "destructive",
        });
        resetState();
      } finally {
        setIsLoading(false);
      }
    },
    [
      fetchEmployeeByRfid,
      isLoading,
      isSubmitting,
      resetState,
      showPrompt,
      toast,
    ],
  );

  // Set up RFID listener
  useEffect(() => {
    const listener = (tag: string) => {
      handleScan(tag);
    };

    rfidListeners.add(listener);

    return () => {
      rfidListeners.delete(listener);
    };
  }, [handleScan]);

  // Handle clock actions (in/out)
  const handleClockAction = async (type: "in" | "out") => {
    if (!employeeInfo || isSubmitting) return;

    setActionType(type);
    setIsSubmitting(true);

    try {
      const result = await recordClockEvent(employeeInfo.id, type);

      if (result.success) {
        toast({
          title: `Clocked ${type === "in" ? "In" : "Out"} Successfully`,
          description: `${employeeInfo.name} at ${format(result.eventTime, "PPpp")}`,
          duration: 5000,
        });
      } else {
        throw new Error(
          result.message || `Clock ${type} failed. Please try again.`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: `Clock ${type === "in" ? "In" : "Out"} Failed`,
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
    let tagToScan = TEST_RFID_TAGS.UNREGISTERED;

    if (tagType === "registered") {
      tagToScan = TEST_RFID_TAGS.ALICE;
    } else if (tagType === "random_registered") {
      tagToScan =
        Math.random() > 0.5 ? TEST_RFID_TAGS.ALICE : TEST_RFID_TAGS.BOB;
    }

    simulateRfidScan(tagToScan);

    toast({
      title: "Test Scan Triggered",
      description: `Simulating scan with ${tagType} tag: ${tagToScan}`,
      duration: 3000,
    });
  };

  // Calculate display values
  const isEmployeeClockedIn =
    employeeInfo?.currentStatus?.status === "clocked_in";
  const lastEventDisplayTime = employeeInfo?.currentStatus?.clock_in_time
    ? format(new Date(employeeInfo.currentStatus.clock_in_time), "p")
    : "N/A";

  return (
    <Card className="relative min-h-[250px] shadow-lg glass-effect flex flex-col">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg z-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-muted-foreground">
            {`Verifying RFID Tag: ${scannedTag}...`}
          </p>
        </div>
      )}

      {/* Main card content */}
      <CardContent className="flex flex-col items-center space-y-4 p-6 text-center justify-center flex-grow">
        <Nfc
          className={`h-16 w-16 ${isListening && !isLoading ? "text-primary animate-pulse" : "text-muted-foreground"}`}
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
            <Info className="h-4 w-4" />
            <span>
              You are currently offline. Clocking functionality may be limited.
            </span>
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
            disabled={isLoading || showPrompt}
          >
            <ScanLine className="mr-2 h-4 w-4" /> Simulate Registered Tag Scan
          </Button>
          <Button
            onClick={() => triggerTestScan("unregistered")}
            variant="outline"
            size="sm"
            className="w-full"
            disabled={isLoading || showPrompt}
          >
            <ScanLine className="mr-2 h-4 w-4 text-destructive" /> Simulate
            Unregistered Tag
          </Button>
        </div>
      </CardContent>

      {/* Clock action dialog */}
      <Dialog
        open={showPrompt && !!employeeInfo && !isLoading}
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
                disabled={isEmployeeClockedIn || isSubmitting}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white text-base py-3"
              >
                {isSubmitting && actionType === "in" ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-5 w-5" />
                )}
                Clock In
              </Button>

              {/* Clock Out button */}
              <Button
                onClick={() => handleClockAction("out")}
                disabled={!isEmployeeClockedIn || isSubmitting}
                className="flex-1 text-base py-3"
                variant="destructive"
              >
                {isSubmitting && actionType === "out" ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-5 w-5" />
                )}
                Clock Out
              </Button>
            </div>

            {/* Processing indicator */}
            {isSubmitting && (
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
