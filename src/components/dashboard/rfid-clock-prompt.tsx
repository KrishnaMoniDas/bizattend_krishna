'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Nfc, LogIn, LogOut, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

// Mock API functions (replace with actual API calls)
interface EmployeeInfo {
    id: string;
    name: string;
    isClockedIn: boolean;
    lastEventTime: string | null; // ISO String
}

// Simulates fetching employee details based on RFID tag
async function fetchEmployeeByRfid(rfidTag: string): Promise<EmployeeInfo | null> {
    console.log(`Fetching employee for RFID: ${rfidTag}`);
    await new Promise(resolve => setTimeout(resolve, 600)); // Simulate network delay

    // Retrieve from localStorage if available (using data from EmployeeRegistration)
    const storedEmployees = localStorage.getItem('bizattend_employees');
    if (storedEmployees) {
        const employees: Array<{id: string; name: string; email: string; rfidTag: string | null}> = JSON.parse(storedEmployees);
        const foundEmployee = employees.find(e => e.rfidTag === rfidTag);

        if (foundEmployee) {
             // Simulate fetching clock status (could be another API call or part of the employee data)
             const storedStatus = localStorage.getItem(`clockStatus_${foundEmployee.id}`);
             const status = storedStatus ? JSON.parse(storedStatus) : { clockedIn: false, lastEventTime: null };

            return {
                id: foundEmployee.id,
                name: foundEmployee.name,
                isClockedIn: status.clockedIn,
                lastEventTime: status.lastEventTime,
            };
        }
    }

    // Fallback mock data if not found in local storage
    if (rfidTag === 'A1B2C3D4') { // Example tag from registration mock
        const storedStatus = localStorage.getItem(`clockStatus_EMP001`);
        const status = storedStatus ? JSON.parse(storedStatus) : { clockedIn: false, lastEventTime: null };
        return { id: 'EMP001', name: 'Alice Smith', isClockedIn: status.clockedIn, lastEventTime: status.lastEventTime };
    }
     if (rfidTag === 'E5F6G7H8') { // Example tag from registration mock
        const storedStatus = localStorage.getItem(`clockStatus_EMP003`);
        const status = storedStatus ? JSON.parse(storedStatus) : { clockedIn: false, lastEventTime: null };
        return { id: 'EMP003', name: 'Charlie Brown', isClockedIn: status.clockedIn, lastEventTime: status.lastEventTime };
    }


    console.log(`Employee not found for RFID: ${rfidTag}`);
    return null;
}

// Simulates recording the clock event
async function recordClockEventRfid(employeeId: string, eventType: 'in' | 'out'): Promise<{ success: boolean; eventTime: Date }> {
  console.log(`Recording clock ${eventType} for ${employeeId} via RFID`);
  const eventTime = new Date();
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 400));

  // Update local storage for demo purposes
  localStorage.setItem(`clockStatus_${employeeId}`, JSON.stringify({ clockedIn: eventType === 'in', lastEventTime: eventTime.toISOString() }));

  // In a real app, send to backend API
  return { success: true, eventTime };
}

// --- RFID Reader Simulation ---
// In a real app, this would likely use WebSockets, MQTT, or Server-Sent Events
// to get real-time data from the ESP32. Here, we simulate with intervals.
let rfidListener: ((tag: string) => void) | null = null;

// Function to simulate an RFID tag being scanned by the ESP32
function simulateRfidScan(tag: string) {
    console.log(`Simulating RFID scan event: ${tag}`);
    if (rfidListener) {
        rfidListener(tag);
    }
}

// Example: Simulate scans every 10-20 seconds (for demo purposes)
// useEffect(() => {
//     const intervalId = setInterval(() => {
//         if (Math.random() > 0.7) { // Randomly trigger a scan
//             const tags = ['A1B2C3D4', 'E5F6G7H8', 'UNKNOWN_TAG', 'XYZ789'];
//             const randomTag = tags[Math.floor(Math.random() * tags.length)];
//             simulateRfidScan(randomTag);
//         }
//     }, Math.random() * 10000 + 10000); // Between 10 and 20 seconds

//     return () => clearInterval(intervalId);
// }, []);
// -----------------------------


export function RfidClockPrompt() {
  const [isListening, setIsListening] = useState<boolean>(true); // Assume listener starts active
  const [scannedTag, setScannedTag] = useState<string | null>(null);
  const [employeeInfo, setEmployeeInfo] = useState<EmployeeInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { toast } = useToast();


   // Function to handle incoming RFID scans
   const handleScan = useCallback(async (tagId: string) => {
    if (isLoading || isSubmitting || showPrompt) return; // Prevent handling multiple scans at once

    console.log(`RFID Tag Detected: ${tagId}`);
    setScannedTag(tagId);
    setIsLoading(true);
    setShowPrompt(false); // Close any previous prompt
    setEmployeeInfo(null); // Reset employee info

    try {
      const employee = await fetchEmployeeByRfid(tagId);
      setEmployeeInfo(employee);
      if (employee) {
        setShowPrompt(true); // Show clock in/out options
      } else {
        toast({
          title: 'Unknown RFID Tag',
          description: `Tag ID ${tagId} is not associated with an employee.`,
          variant: 'destructive',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error fetching employee by RFID:', error);
      toast({
        title: 'Error',
        description: 'Could not verify RFID tag.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, isSubmitting, showPrompt, toast]); // Add dependencies


  // Effect to set up the simulated RFID listener
  useEffect(() => {
     console.log("Setting up RFID listener simulation.");
     rfidListener = handleScan;

     // Cleanup function
     return () => {
        console.log("Cleaning up RFID listener simulation.");
       rfidListener = null;
     };
  }, [handleScan]); // Rerun if handleScan changes


  const handleClockAction = async (actionType: 'in' | 'out') => {
    if (!employeeInfo) return;

    setIsSubmitting(true);
    try {
      const result = await recordClockEventRfid(employeeInfo.id, actionType);
      if (result.success) {
        toast({
          title: `Success: ${employeeInfo.name} Clocked ${actionType === 'in' ? 'In' : 'Out'}`,
          description: `Time: ${format(result.eventTime, 'PPpp')}`,
          duration: 5000,
          variant: 'default',
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
        });
        setShowPrompt(false); // Close dialog on success
        setEmployeeInfo(null); // Reset state
        setScannedTag(null);
      } else {
        throw new Error('Clock event failed on server');
      }
    } catch (error) {
      console.error(`Failed to clock ${actionType}:`, error);
      toast({
        title: 'Error',
        description: `Could not record clock ${actionType} event for ${employeeInfo.name}.`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to manually trigger scan simulation (for testing)
  const triggerTestScan = () => {
     const tags = ['A1B2C3D4', 'E5F6G7H8', 'UNKNOWN_TAG'];
     const randomTag = tags[Math.floor(Math.random() * tags.length)];
     simulateRfidScan(randomTag);
  }

  return (
    <div className="flex flex-col items-center space-y-4 p-4 border border-dashed border-primary/50 rounded-lg text-center min-h-[150px] justify-center relative glass-card bg-primary/5">
       {/* Overlay while loading employee data */}
       {isLoading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg z-10">
             <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
             <p className="text-muted-foreground">Verifying RFID Tag: {scannedTag}...</p>
          </div>
       )}

       {/* Overlay while submitting clock action */}
       {isSubmitting && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg z-10">
             <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
             <p className="text-muted-foreground">Recording action...</p>
          </div>
       )}

       <Nfc className={`h-12 w-12 ${isListening ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
       <p className="text-lg font-medium">Ready for RFID Scan</p>
       <p className="text-sm text-muted-foreground">
         Present your employee badge to the reader to clock in or out.
       </p>

        {/* Button to manually trigger scan for demo */}
        <Button onClick={triggerTestScan} variant="outline" size="sm" className="mt-4">
            Simulate Scan (Test)
        </Button>


      <Dialog open={showPrompt && !!employeeInfo && !isLoading && !isSubmitting} onOpenChange={(open) => { if (!open) { setShowPrompt(false); setEmployeeInfo(null); setScannedTag(null); }}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clock Action for {employeeInfo?.name}</DialogTitle>
            <DialogDescription>
              RFID Tag {scannedTag} detected. Choose your action.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Current Status: {employeeInfo?.isClockedIn ? `Clocked In since ${employeeInfo.lastEventTime ? format(new Date(employeeInfo.lastEventTime), 'p') : 'N/A'}` : 'Clocked Out'}
            </p>
            <div className="flex justify-around gap-4">
              <Button
                onClick={() => handleClockAction('in')}
                disabled={employeeInfo?.isClockedIn || isSubmitting}
                className="flex-1"
                variant="default"
              >
                <LogIn className="mr-2 h-4 w-4" /> Clock In
              </Button>
              <Button
                onClick={() => handleClockAction('out')}
                disabled={!employeeInfo?.isClockedIn || isSubmitting}
                className="flex-1"
                variant="destructive"
              >
                <LogOut className="mr-2 h-4 w-4" /> Clock Out
              </Button>
            </div>
          </div>
           <DialogFooter>
             {/* Optional: Add a cancel button if needed, though closing the dialog works */}
             {/* <Button variant="outline" onClick={() => setShowPrompt(false)}>Cancel</Button> */}
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
