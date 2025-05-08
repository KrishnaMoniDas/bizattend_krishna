'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Nfc, LogIn, LogOut, Loader2, CheckCircle, AlertCircle, WifiOff } from 'lucide-react';
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

async function fetchEmployeeByRfidFromSupabase(rfidTag: string, signal?: AbortSignal): Promise<ClockEmployeeInfo | null> {
    const { data: employeeData, error } = await supabase
        .from('employees')
        .select('id, name')
        .eq('rfid_tag', rfidTag)
        .abortSignal(signal)
        .single();

    if (error) {
        if (error.name !== 'AbortError') {
            if (error.code === 'PGRST116') console.log(`Employee not found for RFID: ${rfidTag}`);
            else console.error('Error fetching employee by RFID:', error);
        }
        return null;
    }
    return employeeData ? { id: employeeData.id, name: employeeData.name } : null;
}

async function fetchLastAttendanceRecord(employeeId: string, signal?: AbortSignal): Promise<AttendanceRecord | null> {
    const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', employeeId)
        .order('clock_in_time', { ascending: false }) // Most recent first
        .abortSignal(signal)
        .limit(1)
        .maybeSingle(); // Use maybeSingle to handle 0 or 1 record gracefully

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
      .eq('id', lastRecord.id); // Ensure targeting the specific record
    if (error) {
      console.error('Error clocking out:', error);
      return { success: false, eventTime, message: error.message };
    }
  }
  return { success: true, eventTime };
}

let rfidListener: ((tag: string) => void) | null = null;
function simulateRfidScan(tag: string) {
    if (rfidListener) rfidListener(tag);
}

export function RfidClockPrompt() {
  const [isListening, setIsListening] = useState<boolean>(true);
  const [scannedTag, setScannedTag] = useState<string | null>(null);
  const [employeeInfo, setEmployeeInfo] = useState<ClockEmployeeInfo & { currentStatus?: AttendanceRecord } | null>(null);
  const [isLoadingEmployee, setIsLoadingEmployee] = useState<boolean>(false);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [isSubmittingClockAction, setIsSubmittingClockAction] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState(true);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();


  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();
    return () => {
        window.removeEventListener('online', updateOnlineStatus);
        window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const handleScan = useCallback(async (tagId: string) => {
    if (isLoadingEmployee || isSubmittingClockAction || showPrompt) return;

    setScannedTag(tagId);
    setIsLoadingEmployee(true);
    setShowPrompt(false);
    setEmployeeInfo(null);

    const abortController = new AbortController();

    try {
      const employee = await fetchEmployeeByRfidFromSupabase(tagId, abortController.signal);
      if (abortController.signal.aborted) return;

      if (employee) {
        const lastRecord = await fetchLastAttendanceRecord(employee.id, abortController.signal);
        if (abortController.signal.aborted) return;
        setEmployeeInfo({ ...employee, currentStatus: lastRecord || undefined });
        setShowPrompt(true);
      } else {
        toast({
          title: 'Unknown RFID Tag',
          description: `Tag ID ${tagId} is not registered. Please contact an administrator.`,
          variant: 'destructive',
          duration: 7000,
        });
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error processing RFID scan:', error);
        toast({ title: 'Scan Error', description: 'Could not verify RFID tag. Check connection or try again.', variant: 'destructive' });
      }
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoadingEmployee(false);
      }
    }
  }, [isLoadingEmployee, isSubmittingClockAction, showPrompt, toast]);


  useEffect(() => {
     rfidListener = (tag) => startTransition(() => { handleScan(tag); });
     return () => { rfidListener = null; };
  }, [handleScan]);


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
        setShowPrompt(false);
        setEmployeeInfo(null); // Reset after successful action
        setScannedTag(null);
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
      setIsSubmittingClockAction(false);
    }
  };

  const triggerTestScan = () => {
     const testTags = ["YOUR_ACTUAL_REGISTERED_RFID_TAG", "UNREGISTERED_TAG_EXAMPLE"];
     const randomTag = testTags[Math.floor(Math.random() * testTags.length)];
     simulateRfidScan(randomTag);
     toast({title: "Test Scan Triggered", description: `Simulating scan with tag: ${randomTag}. Ensure the tag exists in your DB for a positive test.`})
  }

  const isEmployeeClockedIn = employeeInfo?.currentStatus?.status === 'clocked_in' && !employeeInfo?.currentStatus?.clock_out_time;
  const lastEventDisplayTime = employeeInfo?.currentStatus?.clock_in_time ? format(new Date(employeeInfo.currentStatus.clock_in_time), 'p') : 'N/A';


  return (
    <Card className="relative min-h-[250px] shadow-lg glass-effect flex flex-col">
       {(isLoadingEmployee || isPending) && ( // Show loader if fetching employee or transition is pending
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg z-20">
             <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
             <p className="text-muted-foreground">
                {isLoadingEmployee ? `Verifying RFID Tag: ${scannedTag}...` : 'Processing...'}
             </p>
          </div>
       )}

      <CardContent className="flex flex-col items-center space-y-4 p-6 text-center justify-center flex-grow">
        <Nfc className={`h-16 w-16 ${isListening ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
        <p className="text-xl font-semibold text-foreground">Ready for RFID Scan</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Present your employee badge to the RFID reader.
        </p>
        {!isOnline && (
            <div className="mt-2 flex items-center text-sm text-amber-600 dark:text-amber-400 p-2 bg-amber-500/10 rounded-md border border-amber-500/30">
                <WifiOff className="h-4 w-4 mr-2 shrink-0" />
                You are currently offline. Clocking functionality may be limited.
            </div>
        )}
        <Button onClick={triggerTestScan} variant="outline" size="sm" className="mt-2" disabled={isLoadingEmployee || isPending}>
            Simulate Scan (Test)
        </Button>
      </CardContent>

      <Dialog open={showPrompt && !!employeeInfo && !isLoadingEmployee && !isPending} onOpenChange={(open) => { if (!open && !isSubmittingClockAction) { setShowPrompt(false); setEmployeeInfo(null); setScannedTag(null); }}}>
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
                <LogIn className="mr-2 h-5 w-5" /> Clock In
              </Button>
              <Button
                onClick={() => handleClockAction('out')}
                disabled={!isEmployeeClockedIn || isSubmittingClockAction}
                className="flex-1 text-base py-3"
                variant="destructive"
              >
                <LogOut className="mr-2 h-5 w-5" /> Clock Out
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
