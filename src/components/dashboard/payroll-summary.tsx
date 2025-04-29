'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { calculatePayroll, type Payroll } from '@/services/payroll'; // Assuming service exists
import { useToast } from '@/hooks/use-toast';
import { IndianRupee, Hourglass, AlertCircle } from 'lucide-react';
import { subDays, startOfMonth, endOfMonth, format } from 'date-fns';

interface PayrollSummaryProps {
  employeeId: string;
}

export function PayrollSummary({ employeeId }: PayrollSummaryProps) {
  const [payrollData, setPayrollData] = useState<Payroll | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchPayroll() {
      setIsLoading(true);
      setError(null);
      try {
        // Determine current pay period (e.g., this month)
        // In a real app, this logic might be more complex or based on company settings
        const now = new Date();
        const startDate = startOfMonth(now);
        const endDate = endOfMonth(now);

        const data = await calculatePayroll(employeeId, startDate, endDate);
        setPayrollData(data);
      } catch (err) {
        console.error('Failed to fetch payroll data:', err);
        setError('Could not load payroll summary. Please try again later.');
        toast({
          title: 'Error',
          description: 'Failed to fetch payroll data.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchPayroll();
  }, [employeeId, toast]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center space-x-2 text-destructive">
        <AlertCircle className="h-4 w-4" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!payrollData) {
    return <p className="text-sm text-muted-foreground">No payroll data available for the current period.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Pay Period</span>
        <span className="text-sm font-medium">{payrollData.payPeriod || 'N/A'}</span>
      </div>
       <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Total Hours</span>
        <span className="text-sm font-medium">{payrollData.totalWorkHours} hrs</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Overtime Hours</span>
        <span className="text-sm font-medium">{payrollData.overtimeHours} hrs</span>
      </div>
       <div className="flex items-center justify-between pt-2 border-t">
        <span className="text-sm font-semibold">Estimated Salary</span>
         <span className="flex items-center text-lg font-bold text-primary">
            <IndianRupee className="h-4 w-4 mr-1" />
            {payrollData.totalSalary.toLocaleString('en-IN')}
        </span>
      </div>
      <p className="text-xs text-muted-foreground pt-2">*This is an estimate based on recorded hours. Final payroll may vary.</p>
    </div>
  );
}
