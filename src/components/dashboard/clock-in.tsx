'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogIn, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

// Mock API functions (replace with actual API calls)
async function fetchClockStatus(employeeId: string): Promise<{ clockedIn: boolean; lastEventTime: Date | null }> {
  console.log(`Fetching clock status for ${employeeId}`);
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  // In a real app, fetch from backend based on employeeId
  const storedStatus = localStorage.getItem(`clockStatus_${employeeId}`);
  if (storedStatus) {
    return JSON.parse(storedStatus);
  }
  return { clockedIn: false, lastEventTime: null }; // Default status
}

async function recordClockEvent(employeeId: string, eventType: 'in' | 'out'): Promise<{ success: boolean; eventTime: Date }> {
  console.log(`Recording clock ${eventType} for ${employeeId}`);
  const eventTime = new Date();
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 300));

  // Update local storage for demo purposes
  localStorage.setItem(`clockStatus_${employeeId}`, JSON.stringify({ clockedIn: eventType === 'in', lastEventTime: eventTime }));

  // In a real app, send to backend API
  return { success: true, eventTime };
}

interface ClockInComponentProps {
  employeeId: string;
}

export function ClockInComponent({ employeeId }: ClockInComponentProps) {
  const [isClockedIn, setIsClockedIn] = useState<boolean>(false);
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000 * 60); // Update every minute
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadStatus() {
      setIsLoading(true);
      try {
        const status = await fetchClockStatus(employeeId);
        setIsClockedIn(status.clockedIn);
        setLastEventTime(status.lastEventTime ? new Date(status.lastEventTime) : null);
      } catch (error) {
        console.error('Failed to fetch clock status:', error);
        toast({
          title: 'Error',
          description: 'Could not load clock status.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadStatus();
  }, [employeeId, toast]);

  const handleClockAction = async () => {
    setIsSubmitting(true);
    const actionType = isClockedIn ? 'out' : 'in';
    try {
      const result = await recordClockEvent(employeeId, actionType);
      if (result.success) {
        setIsClockedIn(actionType === 'in');
        setLastEventTime(result.eventTime);
        toast({
          title: `Successfully Clocked ${actionType === 'in' ? 'In' : 'Out'}`,
          description: `Time: ${format(result.eventTime, 'PPpp')}`,
        });
      } else {
        throw new Error('Clock event failed');
      }
    } catch (error) {
      console.error(`Failed to clock ${actionType}:`, error);
      toast({
        title: 'Error',
        description: `Could not record clock ${actionType} event. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
       <div className="text-center">
        <p className="text-2xl font-semibold">{format(currentTime, 'hh:mm a')}</p>
        <p className="text-sm text-muted-foreground">{format(currentTime, 'eeee, MMMM do')}</p>
      </div>

      {isLoading ? (
        <p>Loading status...</p>
      ) : (
        <Button
          onClick={handleClockAction}
          disabled={isSubmitting}
          className={`w-full ${isClockedIn ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'}`}
        >
          {isSubmitting ? (
            'Processing...'
          ) : isClockedIn ? (
            <>
              <LogOut className="mr-2 h-4 w-4" /> Clock Out
            </>
          ) : (
            <>
              <LogIn className="mr-2 h-4 w-4" /> Clock In
            </>
          )}
        </Button>
      )}

      <p className="text-sm text-muted-foreground">
        {isClockedIn
          ? `Clocked in since: ${lastEventTime ? format(lastEventTime, 'p') : 'N/A'}`
          : `Last clock out: ${lastEventTime ? format(lastEventTime, 'p') : 'N/A'}`}
      </p>
    </div>
  );
}
