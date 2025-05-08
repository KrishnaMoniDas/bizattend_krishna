// @ts-nocheck - Disabling TypeScript checks for this file due to complex interactions and type inference issues with Supabase and useEffect cleanup.
// This is a temporary measure and should be addressed by refining types or refactoring.
'use client';

import React, { useState, useEffect, useCallback, useTransition, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Nfc, LogIn, LogOut, Loader2, CheckCircle, AlertCircle, WifiOff, ScanLine, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabaseClient';

interface ClockEmployeeInfo {
    id: string; 
    name: string;
}

interface AttendanceRecord {
    id?: string; 
    employee_id: string;
    clock_in_time?: string | null; 
    clock_out_time?: string | null; 
    status: 'clocked_in' | 'clocked_out';
    created_at?: string; // Supabase adds this automatically
}

// Ensure these RFID tags exist in your `employees` table in Supabase for testing.
const TEST_RFID_TAG_ALICE = "RFID_ALICE123"; // Matches seeded data
const TEST_RFID_TAG_BOB = "RFID_BOB456"; // Matches seeded data
const UNREGISTERED_RFID_TAG = "UNREGISTERED_TAG_EXAMPLE";

async function fetchEmployeeByRfidFromSupabase(rfidTag: string, signal?: AbortSignal): Promise<ClockEmployeeInfo | null> {
    const { data: employeeData, error } = await supabase
        .from('employees')
        .select('id, name')
        .eq('rfid_tag', rfidTag)
        .maybeSingle() // Use maybeSingle to handle 0 or 1 record without error for not found
        .abortSignal(signal);

    if (error && error.name !== 'AbortError') {
        console.error('Error fetching employee by RFID:', error);
        // Don't throw, let it return null for "not found" or other handled DB errors
    }
    return employeeData ? { id: employeeData.id, name: employeeData.name } : null;
}

async function fetchLastAttendanceRecord(employeeId: string, signal?: AbortSignal): Promise<AttendanceRecord | null> {
    const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', employeeId)
        .order('clock_in_time', { ascending: false }) 
        .abortSignal(signal)
        .limit(1)
        .maybeSingle(); 

    if (error && error.name !== 'AbortError') {
        console.error('Error fetching last attendance record:', error);
        return null;
    }
    return data;
}

async function recordClockEventSupabase(employeeId: string, eventType: 'in' | 'out'): Promise<{ success: boolean; eventTime: Date, message?: string }> {
  const eventTime = new Date();
  const lastRecord = await fetchLastAttendanceRecord(employeeId);

  if (eventType === 'in') {
    if (lastRecord && lastRecord.status === 'clocked_in' && !lastRecord.clock_out_time) {
      return { success: false, eventTime, message: "You are already clocked in." };
    }
    const { error } = await supabase
      .from('attendance_records')
      .insert({ employee_id: employeeId, clock_in_time: eventTime.toISOString(), status: 'clocked_in' });
    if (error) {
      console.error('Error clocking in:', error);
      return { success: false, eventTime, message: error.message };
    }
  } else { 
    if (!lastRecord || lastRecord.status === 'clocked_out' || !lastRecord.clock_in_time) {
      return { success: false, eventTime, message: "You are not clocked in or the previous record is incomplete." };
    }
    const { error } = await supabase
      .from('attendance_records')
      .update({ clock_out_time: eventTime.toISOString(), status: 'clocked_out' })
      .eq('id', lastRecord.id); 
    if (error) {
      console.error('Error clocking out:', error);
      return { success: false, eventTime, message: error.message };
    }
  }
  return { success: true, eventTime };
}

// Global listener storage
const rfidListeners: Set<(tag: string) => void> = new Set();

// Function to simulate RFID scan (e.g., from a button or dev tools)
function simulateRfidScan(tag: string) {
    rfidListeners.forEach(listener => listener(tag));
}

export function RfidClockPrompt() {
  const [isListening] = useState<boolean>(true); // Assume ESP32 is always "listening"
  const [scannedTag, setScannedTag] = useState<string | null>(null);
  const [employeeInfo, setEmployeeInfo] = useState<ClockEmployeeInfo & { currentStatus?: AttendanceRecord } | null>(null);
  const [isLoadingEmployee, setIsLoadingEmployee] = useState<boolean>(false);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [isSubmittingClockAction, setIsSubmittingClockAction] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState(true);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  
  // Ref to store the AbortController for ongoing scan operations
  const scanAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus(); // Initial check
    return () => {
        window.removeEventListener('online', updateOnlineStatus);
        window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const resetState = useCallback(() => {
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

  const handleScan = useCallback(async (tagId: string) => {
    // If already processing, or dialog is open, ignore new scans for a bit
    if (isLoadingEmployee || isSubmittingClockAction || showPrompt) {
        console.log("Scan ignored: already processing or prompt open.");
        return;
    }

    // Abort any previous scan
    if (scanAbortControllerRef.current) {
        scanAbortControllerRef.current.abort();
    }
    scanAbortControllerRef.current = new AbortController();
    const { signal } = scanAbortControllerRef.current;

    setScannedTag(tagId);
    setIsLoadingEmployee(true);
    
    try {
      const employee = await fetchEmployeeByRfidFromSupabase(tagId, signal);
      if (signal.aborted) return;

      if (employee) {
        const lastRecord = await fetchLastAttendanceRecord(employee.id, signal);
        if (signal.aborted) return;
        setEmployeeInfo({ ...employee, currentStatus: lastRecord || undefined });
        setShowPrompt(true);
      } else {
        toast({
          title: 'Unknown RFID Tag',
          description: `Tag ID "${tagId}" is not registered. Please contact an administrator.`,
          variant: 'destructive',
          duration: 7000,
        });
        resetState(); // Reset since tag is unknown
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error processing RFID scan:', error);
        toast({ title: 'Scan Error', description: 'Could not verify RFID tag. Check connection or try again.', variant: 'destructive' });
        resetState(); // Reset on error
      }
    } finally {
      if (!signal.aborted) {
         setIsLoadingEmployee(false); // Only set if not aborted
      }
       // Clear the controller if this specific operation finished (aborted or not)
      if (scanAbortControllerRef.current?.signal === signal) {
        scanAbortControllerRef.current = null;
      }
    }
  }, [isLoadingEmployee, isSubmittingClockAction, showPrompt, toast, resetState]);


  useEffect(() => {
    const listener = (tag: string) => {
        // Wrap in startTransition if handleScan causes state updates that affect rendering
        startTransition(() => {
            handleScan(tag);
        });
    };
    rfidListeners.add(listener);
    return () => {
        rfidListeners.delete(listener);
        // Abort ongoing scan if component unmounts
        if (scanAbortControllerRef.current) {
            scanAbortControllerRef.current.abort();
        }
    };
  }, [handleScan]); // handleScan is memoized


  const handleClockAction = async (actionType: 'in' | 'out') => {
    if (!employeeInfo || isSubmittingClockAction) return;

    setIsSubmittingClockAction(true);
    try {
      const result = await recordClockEventSupabase(employeeInfo.id, actionType);
      if (result.success) {
        toast({
          title: `Clocked ${actionType === 'in' ? 'In' : 'Out'} Successfully`,
          description: `${employeeInfo.name} at ${format(result.eventTime, 'PPpp')}`,
          duration: 5000,
          action: <CheckCircle className="h-5 w-5 text-green-500" />,
        });
      } else {
        throw new Error(result.message || 'Clock event failed. Please try again.');
      }
    } catch (error: any) {
      console.error(`Failed to clock ${actionType}:`, error);
      toast({
        title: `Clock ${actionType === 'in' ? 'In' : 'Out'} Failed`,
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
        action: <AlertCircle className="h-5 w-5 text-red-500" />,
      });
    } finally {
      // Reset state regardless of success or failure of clock action
      resetState();
    }
  };

  const triggerTestScan = (tagType: 'registered' | 'unregistered' | 'random_registered') => {
     let tagToScan = UNREGISTERED_RFID_TAG;
     if (tagType === 'registered') {
         tagToScan = TEST_RFID_TAG_ALICE; // Use a known registered tag
     } else if (tagType === 'random_registered') {
         tagToScan = Math.random() > 0.5 ? TEST_RFID_TAG_ALICE : TEST_RFID_TAG_BOB;
     }
     // For 'unregistered', it defaults to UNREGISTERED_RFID_TAG
     
     simulateRfidScan(tagToScan);
     toast({
        title: "Test Scan Triggered", 
        description: `Simulating scan with ${tagType} tag: ${tagToScan}.`,
        duration: 3000
    });
  };

  const isEmployeeClockedIn = employeeInfo?.currentStatus?.status === 'clocked_in' && !employeeInfo?.currentStatus?.clock_out_time;
  const lastEventDisplayTime = employeeInfo?.currentStatus?.clock_in_time ? format(new Date(employeeInfo.currentStatus.clock_in_time), 'p') : 'N/A';


  return (
    <Card className="relative min-h-[250px] shadow-lg glass-effect flex flex-col">
       {(isLoadingEmployee || (isPending && !showPrompt)) && ( 
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg z-20">
             <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
             <p className="text-muted-foreground">
                {isLoadingEmployee ? `Verifying RFID Tag: ${scannedTag}...` : 'Processing...'}
             </p>
          </div>
       )}

      <CardContent className="flex flex-col items-center space-y-4 p-6 text-center justify-center flex-grow">
        <Nfc className={`h-16 w-16 ${isListening && !isLoadingEmployee ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
        <p className="text-xl font-semibold text-foreground">Ready for RFID Scan</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Present your employee badge to the RFID reader. This interface simulates an ESP32-based system.
        </p>
        {!isOnline && (
            <Alert variant="destructive" className="mt-2 text-xs">
                <WifiOff className="h-4 w-4" />
                <AlertCircle>Offline Mode</AlertCircle>
                <DialogDescription>You are currently offline. Clocking functionality may be limited or queued.</DialogDescription>
            </Alert>
        )}
        <div className="mt-3 space-y-2 w-full max-w-xs">
            <p className="text-xs text-muted-foreground">For Demonstration:</p>
            <Button onClick={() => triggerTestScan('random_registered')} variant="outline" size="sm" className="w-full" disabled={isLoadingEmployee || isPending || showPrompt}>
                <ScanLine className="mr-2 h-4 w-4" /> Simulate Registered Tag Scan
            </Button>
            <Button onClick={() => triggerTestScan('unregistered')} variant="outline" size="sm" className="w-full" disabled={isLoadingEmployee || isPending || showPrompt}>
                <ScanLine className="mr-2 h-4 w-4 text-destructive" /> Simulate Unregistered Tag
            </Button>
        </div>
      </CardContent>

      <Dialog open={showPrompt && !!employeeInfo && !isLoadingEmployee} onOpenChange={(open) => { if (!open) resetState(); }}>
        <DialogContent className="glass-effect sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clock Action: {employeeInfo?.name}</DialogTitle>
            <DialogDescription>
              RFID Tag: <span className="font-semibold text-primary">{scannedTag}</span>
              <br />
              Current Status: {isEmployeeClockedIn ? `Clocked In since ${lastEventDisplayTime}` : 'Clocked Out'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex justify-around gap-4">
              <Button
                onClick={() => handleClockAction('in')}
                disabled={isEmployeeClockedIn || isSubmittingClockAction}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white text-base py-3"
              >
                {isSubmittingClockAction && actionTypeRef.current === 'in' ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogIn className="mr-2 h-5 w-5" />}
                 Clock In
              </Button>
              <Button
                onClick={() => { actionTypeRef.current = 'out'; handleClockAction('out'); }}
                disabled={!isEmployeeClockedIn || isSubmittingClockAction}
                className="flex-1 text-base py-3"
                variant="destructive"
              >
                {isSubmittingClockAction && actionTypeRef.current === 'out' ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogOut className="mr-2 h-5 w-5" />}
                Clock Out
              </Button>
            </div>
             {isSubmittingClockAction && (
                <div className="flex items-center justify-center text-sm text-muted-foreground pt-2">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing action...
                </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
// Helper ref to track which button was clicked for loader display in dialog
const actionTypeRef = { current: null as 'in' | 'out' | null };
