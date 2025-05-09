'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle2, Hourglass, Info, ListFilter } from 'lucide-react';
import { attendanceAnomalyDetection, AttendanceAnomalyDetectionInput, AttendanceAnomalyDetectionOutput } from '@/ai/flows/attendance-anomaly-detection';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO, startOfDay, endOfDay, subDays, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient'; 
import { useSession } from 'next-auth/react';

interface AttendanceAnomaliesProps {
  employeeId: string; 
}

interface RawAttendanceRecord {
  id: string;
  employee_id: string;
  employee_name?: string; // Optionally join employee name
  clock_in_time: string; 
  clock_out_time: string | null;
  // Expected times are assumed to be standard for now, but could be fetched from employee schedule
  expected_clock_in_hour?: number; // e.g., 9
  expected_clock_out_hour?: number; // e.g., 17
}

async function fetchRecentAttendanceSupabase(
  employeeIdForAnomaly: string, 
  daysToFetch: number = 7, 
  signal?: AbortSignal
): Promise<RawAttendanceRecord[]> {

  const dateLimit = subDays(new Date(), daysToFetch);
  
  let query = supabase
    .from('attendance_records')
    .select(`
      id,
      employee_id,
      clock_in_time,
      clock_out_time,
      employees ( name ) 
    `) // Join with employees table to get name
    .gte('clock_in_time', dateLimit.toISOString())
    .order('clock_in_time', { ascending: false })
    .abortSignal(signal);

  if (employeeIdForAnomaly !== 'admin_view') {
     query = query.eq('employee_id', employeeIdForAnomaly);
  } else {
      // For admin_view, fetch for all employees or apply admin-specific filters
      // This might become slow for many records. Consider pagination or more specific filters for admin.
      query = query.limit(50); // Example: Limit for admin view to keep it manageable for demo
  }

  const { data, error } = await query;

  if (error) {
    if (error.name !== 'AbortError') {
        console.error('Error fetching recent attendance from Supabase:', error);
    }
    return [];
  }

  // Map data to include employee_name directly
  return (data || []).map(r => ({
      ...r,
      // Supabase returns joined table as an object or array.
      // Adjust based on your actual Supabase client version and query structure.
      // If 'employees' is an object:
      employee_name: (r.employees as { name: string } | null)?.name,
      // If 'employees' could be an array (though unlikely for a foreign key join like this):
      // employee_name: Array.isArray(r.employees) ? r.employees[0]?.name : r.employees?.name,
  })) as RawAttendanceRecord[];
}

function transformToAnomalyInput(record: RawAttendanceRecord): AttendanceAnomalyDetectionInput | null {
    if (!record.clock_in_time || !isValid(parseISO(record.clock_in_time))) return null;

    const clockInDate = startOfDay(parseISO(record.clock_in_time));
    // Default expected times if not provided by record (e.g., from employee schedule table)
    const expectedClockInHour = record.expected_clock_in_hour || 9;
    const expectedClockOutHour = record.expected_clock_out_hour || 17;

    const expectedClockInTime = new Date(clockInDate);
    expectedClockInTime.setHours(expectedClockInHour, 0, 0, 0);
    
    const expectedClockOutTime = new Date(clockInDate);
    expectedClockOutTime.setHours(expectedClockOutHour, 0, 0, 0);

    return {
        employeeId: record.employee_id, // Use actual employee_id from record
        clockInTime: record.clock_in_time,
        clockOutTime: record.clock_out_time || endOfDay(parseISO(record.clock_in_time)).toISOString(),
        expectedClockInTime: expectedClockInTime.toISOString(),
        expectedClockOutTime: expectedClockOutTime.toISOString(),
    };
}

interface AnomalyResult extends AttendanceAnomalyDetectionOutput {
  record: AttendanceAnomalyDetectionInput; 
  originalRecordId: string; 
  employeeName?: string; // Add employee name for display
}

export function AttendanceAnomalies({ employeeId: propEmployeeId }: AttendanceAnomaliesProps) {
  const { data: session } = useSession();
  const [anomalies, setAnomalies] = useState<AnomalyResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Determine the employee ID to use: prop, then session, then placeholder
  const employeeIdToUse = propEmployeeId !== "current_user_placeholder" 
    ? propEmployeeId 
    : (session?.user?.id || "current_user_placeholder");


  const checkAnomalies = useCallback(async (signal?: AbortSignal) => {
    if (!employeeIdToUse || employeeIdToUse === "current_user_placeholder") {
        setIsLoading(false);
        setAnomalies([]); // Clear anomalies if no valid ID
        return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const rawRecords = await fetchRecentAttendanceSupabase(employeeIdToUse, 7, signal);
      if (signal?.aborted) return;

      if (rawRecords.length === 0) {
        setIsLoading(false);
        setAnomalies([]);
        return;
      }

      const anomalyChecks = rawRecords.map(async (rawRecord) => {
        const inputRecord = transformToAnomalyInput(rawRecord);
        if (!inputRecord) return null;

        try {
          const result = await attendanceAnomalyDetection(inputRecord); // This is an async server action
          if (result.isAnomaly) {
            return { ...result, record: inputRecord, originalRecordId: rawRecord.id, employeeName: rawRecord.employee_name };
          }
          return null;
        } catch (err) {
          console.error(`Anomaly check failed for record ${rawRecord.id}:`, err);
          // Don't toast for every failed check, could be overwhelming. Log it.
          return null;
        }
      });

      // Promise.allSettled might be better if some AI calls fail but others succeed
      const results = await Promise.all(anomalyChecks);
      if (signal?.aborted) return;

      const detectedAnomalies = results.filter(result => result !== null) as AnomalyResult[];
      setAnomalies(detectedAnomalies);

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Failed to fetch or process attendance records:', err);
        setError('Could not load attendance anomalies.');
        toast({
            title: 'Error Loading Anomalies',
            description: 'Failed to retrieve or process attendance data.',
            variant: 'destructive',
        });
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [employeeIdToUse, toast]);

  useEffect(() => {
    const abortController = new AbortController();
    startTransition(() => {
        checkAnomalies(abortController.signal);
    });
    return () => {
        abortController.abort();
    };
  }, [checkAnomalies]);


  if (isLoading || isPending) {
    return (
      <div className="space-y-2 p-1">
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
    );
  }

  if (error) {
     return (
      <Alert variant="destructive" className="shadow">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Anomalies</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (employeeIdToUse === "current_user_placeholder") {
    return (
       <Alert variant="default" className="border-blue-500/50 dark:border-blue-400/50 shadow-sm">
         <Info className="h-4 w-4 text-blue-600 dark:text-blue-500" />
         <AlertTitle className="text-blue-700 dark:text-blue-600">Your Anomalies</AlertTitle>
         <AlertDescription>
           Log in to see personalized attendance anomaly information.
         </AlertDescription>
       </Alert>
    );
  }

  if (anomalies.length === 0) {
    return (
       <Alert variant="default" className="border-green-500/50 dark:border-green-400/50 shadow-sm">
         <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
         <AlertTitle className="text-green-700 dark:text-green-600">All Clear!</AlertTitle>
         <AlertDescription>
           No significant attendance anomalies detected in recent records for your view.
         </AlertDescription>
       </Alert>
    );
  }

  return (
    <ScrollArea className="h-[280px] pr-3"> 
      <div className="space-y-3">
        {employeeIdToUse === "admin_view" && (
            <div className="p-2 bg-accent/10 border border-accent/20 rounded-md text-xs text-accent-foreground flex items-center gap-2">
                <ListFilter className="h-4 w-4" />
                Showing recent anomalies across employees. Use Employee Management for specific user details.
            </div>
        )}
        {anomalies.map((anomaly) => (
          <Alert key={anomaly.originalRecordId} variant="destructive" className="shadow-sm">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              Anomaly: {anomaly.employeeName || `ID ${anomaly.record.employeeId.substring(0,8)}...`} on {format(parseISO(anomaly.record.clockInTime), 'PP')}
            </AlertTitle>
            <AlertDescription className="text-xs space-y-0.5">
              <p><strong>Clocked In:</strong> {format(parseISO(anomaly.record.clockInTime), 'p')} (Expected: {format(parseISO(anomaly.record.expectedClockInTime), 'p')})</p>
              <p><strong>Clocked Out:</strong> {anomaly.record.clockOutTime && isValid(parseISO(anomaly.record.clockOutTime)) ? format(parseISO(anomaly.record.clockOutTime), 'p') : 'N/A'} (Expected: {format(parseISO(anomaly.record.expectedClockOutTime), 'p')})</p>
              <p className="pt-1"><strong>AI Explanation:</strong> {anomaly.anomalyExplanation}</p>
            </AlertDescription>
          </Alert>
        ))}
      </div>
    </ScrollArea>
  );
}
//
