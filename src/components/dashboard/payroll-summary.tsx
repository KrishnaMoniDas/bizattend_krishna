'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { calculatePayroll, type Payroll } from '@/services/payroll'; 
import { useToast } from '@/hooks/use-toast';
import { IndianRupee, AlertCircle, Info, UserCheck } from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSession } from 'next-auth/react';

interface PayrollSummaryProps {
  employeeId: string; 
}

export function PayrollSummary({ employeeId: propEmployeeId }: PayrollSummaryProps) {
  const { data: session } = useSession();
  const [payrollData, setPayrollData] = useState<Payroll | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const employeeIdToUse = propEmployeeId !== "current_user_placeholder" 
    ? propEmployeeId 
    : (session?.user?.id || "current_user_placeholder");

  const fetchPayroll = useCallback(async (signal?: AbortSignal) => {
    if (!employeeIdToUse || employeeIdToUse === "current_user_placeholder") {
        setIsLoading(false);
        setPayrollData(null); 
        setError(employeeIdToUse === "admin_view" ? "Admin overview payroll summary not yet implemented. This card shows individual payroll." : null);
        return;
    }
    
    if (employeeIdToUse === "admin_view") {
        // This component is for individual payroll. Admin overview needs a different logic/component.
        setIsLoading(false);
        setPayrollData(null);
        setError("This component displays individual payroll. For admin overview, a different section/logic is needed.");
        return;
    }


    setIsLoading(true);
    setError(null);
    try {
      const now = new Date();
      const startDate = startOfMonth(now);
      const endDate = endOfMonth(now);

      const data = await calculatePayroll(employeeIdToUse, startDate, endDate); // calculatePayroll should handle its own AbortSignal if it makes network calls
      if (signal?.aborted) return;
      setPayrollData(data);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Failed to fetch payroll data:', err);
        setError(err.message || 'Could not load payroll summary.');
        toast({
            title: 'Error Fetching Payroll',
            description: err.message || 'Failed to fetch payroll data.',
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
        fetchPayroll(abortController.signal);
    });
    return () => {
        abortController.abort();
    };
  }, [fetchPayroll]);


  if (isLoading || isPending) {
    return (
      <div className="space-y-3 p-1">
        <Skeleton className="h-5 w-3/4 rounded" />
        <Skeleton className="h-5 w-1/2 rounded" />
        <Skeleton className="h-5 w-5/6 rounded" />
        <Skeleton className="h-5 w-2/3 rounded" />
        <Skeleton className="h-8 w-full mt-2 rounded" />
      </div>
    );
  }
  
  if (employeeIdToUse === "current_user_placeholder") {
     return (
       <Alert variant="default" className="border-blue-500/50 dark:border-blue-400/50 shadow-sm">
         <Info className="h-4 w-4 text-blue-600 dark:text-blue-500" />
         <AlertTitle className="text-blue-700 dark:text-blue-600">Your Payroll</AlertTitle>
         <AlertDescription>
           Log in to view your personalized payroll summary for the current period.
         </AlertDescription>
       </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="shadow">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Payroll</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (!payrollData) {
    return (
        <Alert variant="default" className="border-orange-500/50 dark:border-orange-400/50 shadow-sm">
            <UserCheck className="h-4 w-4 text-orange-600 dark:text-orange-500" />
            <AlertTitle className="text-orange-700 dark:text-orange-600">Payroll Data Unavailable</AlertTitle>
            <AlertDescription>
                No payroll data available for the current period for {payrollData?.employeeName || employeeIdToUse.substring(0,8) + "..." || "you"}. This could be due to no recorded hours or system setup.
            </AlertDescription>
        </Alert>
    );
  }

  return (
    <div className="space-y-3 p-1">
      {payrollData.employeeName && (
        <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Employee</span>
            <span className="text-sm font-medium">{payrollData.employeeName}</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Pay Period</span>
        <span className="text-sm font-medium">{payrollData.payPeriod}</span>
      </div>
       <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Regular Hours</span>
        <span className="text-sm font-medium">{payrollData.regularHours.toFixed(2)} hrs</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Overtime Hours</span>
        <span className="text-sm font-medium">{payrollData.overtimeHours.toFixed(2)} hrs</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Total Work Hours</span>
        <span className="text-sm font-medium text-primary">{payrollData.totalWorkHours.toFixed(2)} hrs</span>
      </div>
       <div className="flex items-center justify-between pt-2 border-t mt-2">
        <span className="text-sm font-semibold">Estimated Gross Salary</span>
         <span className="flex items-center text-lg font-bold text-primary">
            <IndianRupee className="h-4 w-4 mr-1" />
            {payrollData.totalSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
      <p className="text-xs text-muted-foreground pt-2">*This is an estimate based on recorded hours and configured rates. Deductions and final payroll may vary.</p>
    </div>
  );
}
