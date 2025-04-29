'use client';

import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle, Hourglass } from 'lucide-react';
import { attendanceAnomalyDetection, AttendanceAnomalyDetectionInput, AttendanceAnomalyDetectionOutput } from '@/ai/flows/attendance-anomaly-detection';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface AttendanceAnomaliesProps {
  employeeId: string; // Or fetch relevant records for the admin/manager
}

// Mock function to get recent attendance records (replace with actual API call)
async function fetchRecentAttendance(employeeId: string): Promise<AttendanceAnomalyDetectionInput[]> {
  console.log(`Fetching recent attendance for ${employeeId}`);
  await new Promise(resolve => setTimeout(resolve, 700)); // Simulate delay

  // Example records - Replace with real data from your backend
  // These would typically come from your time tracking system
  const records = [
    {
      employeeId: employeeId,
      clockInTime: "2024-07-28T08:05:00Z", // Slightly late
      clockOutTime: "2024-07-28T17:02:00Z", // Normal out
      expectedClockInTime: "2024-07-28T08:00:00Z",
      expectedClockOutTime: "2024-07-28T17:00:00Z",
    },
    {
      employeeId: employeeId,
      clockInTime: "2024-07-29T07:58:00Z", // Normal in
      clockOutTime: "2024-07-29T16:30:00Z", // Early out
      expectedClockInTime: "2024-07-29T08:00:00Z",
      expectedClockOutTime: "2024-07-29T17:00:00Z",
    },
     {
      employeeId: employeeId,
      clockInTime: "2024-07-30T09:30:00Z", // Very late
      clockOutTime: "2024-07-30T17:05:00Z", // Normal out
      expectedClockInTime: "2024-07-30T08:00:00Z",
      expectedClockOutTime: "2024-07-30T17:00:00Z",
    },
     { // A normal record for comparison
      employeeId: employeeId,
      clockInTime: "2024-07-31T08:01:00Z",
      clockOutTime: "2024-07-31T17:03:00Z",
      expectedClockInTime: "2024-07-31T08:00:00Z",
      expectedClockOutTime: "2024-07-31T17:00:00Z",
    },
  ];
   // Sort by date descending for display
  return records.sort((a, b) => new Date(b.clockInTime).getTime() - new Date(a.clockInTime).getTime());
}

interface AnomalyResult extends AttendanceAnomalyDetectionOutput {
  record: AttendanceAnomalyDetectionInput;
  id: string; // Unique ID for React key
}

export function AttendanceAnomalies({ employeeId }: AttendanceAnomaliesProps) {
  const [anomalies, setAnomalies] = useState<AnomalyResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function checkAnomalies() {
      setIsLoading(true);
      setError(null);
      setAnomalies([]); // Clear previous anomalies

      try {
        const records = await fetchRecentAttendance(employeeId);
        if (records.length === 0) {
          setIsLoading(false);
          return;
        }

        const anomalyChecks = records.map(async (record, index) => {
          try {
            const result = await attendanceAnomalyDetection(record);
             // Only include actual anomalies in the state
             if (result.isAnomaly) {
                return { ...result, record, id: `anomaly-${index}` };
             }
             return null; // Return null for non-anomalies
          } catch (err) {
            console.error(`Anomaly check failed for record ${index}:`, err);
            // Optionally, show a specific error for this record check
             toast({
                title: `Anomaly Check Failed`,
                description: `Could not check record from ${format(parseISO(record.clockInTime), 'P')}.`,
                variant: 'destructive',
                duration: 3000,
            });
            return null; // Treat as non-anomaly on error
          }
        });

        const results = await Promise.all(anomalyChecks);
        const detectedAnomalies = results.filter(result => result !== null) as AnomalyResult[];
        setAnomalies(detectedAnomalies);

      } catch (err) {
        console.error('Failed to fetch or process attendance records:', err);
        setError('Could not load attendance anomalies.');
         toast({
            title: 'Error',
            description: 'Failed to load attendance data for anomaly detection.',
            variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }

    checkAnomalies();
  }, [employeeId, toast]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
     return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (anomalies.length === 0) {
    return (
       <Alert variant="default" className="border-green-500">
         <CheckCircle className="h-4 w-4 text-green-600" />
         <AlertTitle className="text-green-700">All Clear</AlertTitle>
         <AlertDescription>
           No significant attendance anomalies detected in recent records.
         </AlertDescription>
       </Alert>
    );
  }

  return (
    <ScrollArea className="h-[200px] pr-4"> {/* Adjust height as needed */}
      <div className="space-y-3">
        {anomalies.map((anomaly) => (
          <Alert key={anomaly.id} variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Anomaly Detected ({format(parseISO(anomaly.record.clockInTime), 'P')})</AlertTitle>
            <AlertDescription className="text-xs">
              Clocked In: {format(parseISO(anomaly.record.clockInTime), 'p')} (Expected: {format(parseISO(anomaly.record.expectedClockInTime), 'p')}) <br/>
              Clocked Out: {format(parseISO(anomaly.record.clockOutTime), 'p')} (Expected: {format(parseISO(anomaly.record.expectedClockOutTime), 'p')}) <br/>
              <strong>Reason:</strong> {anomaly.anomalyExplanation}
            </AlertDescription>
          </Alert>
        ))}
      </div>
    </ScrollArea>
  );
}
