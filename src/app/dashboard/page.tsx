'use client'; // Required for useSession

import { RfidClockPrompt } from "@/components/dashboard/rfid-clock-prompt";
import { PayrollSummary } from "@/components/dashboard/payroll-summary";
import { AttendanceAnomalies } from "@/components/dashboard/attendance-anomalies";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, AlertTriangle, IndianRupee, Users, Settings, ShieldCheck, BarChart3 } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { data: session, status } = useSession();

  const isLoading = status === "loading";
  const isManager = session?.user?.role === 'manager';
  const employeeIdForComponents = session?.user?.id || "current_user_placeholder"; // For non-managers or if manager is also an employee

  if (isLoading) {
    return <DashboardSkeleton />;
  }
  
  if (status === "unauthenticated") {
    // This should ideally be handled by middleware, but as a fallback:
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center p-8">
            <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-6">You need to be logged in to view this page.</p>
            <Button asChild>
                <Link href="/login?callbackUrl=/dashboard">Login</Link>
            </Button>
        </div>
    );
  }


  return (
    <div className="flex flex-col gap-6 sm:gap-8 py-4 flex-grow">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* RFID Clock-in takes up 1/3 on larger screens, full on smaller */}
            <div className="lg:col-span-1">
                 <RfidClockPrompt />
            </div>

            {/* Manager Panel: Conditionally rendered and takes up 2/3 on larger screens */}
            {isManager && (
              <Card className="shadow-md glass-effect lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <ShieldCheck className="h-7 w-7 text-primary" />
                    <CardTitle className="text-xl">Manager Hub</CardTitle>
                  </div>
                  <CardDescription>Access administrative tools and employee data.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button asChild variant="outline" className="justify-start text-left h-auto py-3.5 px-4 group hover:border-primary transition-all">
                      <Link href="/admin/employees" className="flex items-center space-x-3">
                        <Users className="h-6 w-6 text-accent group-hover:text-primary transition-colors" />
                        <div>
                          <p className="font-semibold text-base">Employee Management</p>
                          <p className="text-xs text-muted-foreground">View, add, edit, and manage all staff.</p>
                        </div>
                      </Link>
                    </Button>
                    <Button variant="outline" className="justify-start text-left h-auto py-3.5 px-4 group hover:border-primary transition-all" disabled>
                        <BarChart3 className="h-6 w-6 text-accent group-hover:text-primary transition-colors" />
                         <div>
                          <p className="font-semibold text-base">Attendance Reports (Soon)</p>
                          <p className="text-xs text-muted-foreground">Generate and view detailed reports.</p>
                        </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
        
        {/* User-specific cards */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-md glass-effect">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">My Payroll Summary</CardTitle>
              <IndianRupee className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <PayrollSummary employeeId={employeeIdForComponents} />
            </CardContent>
          </Card>

          <Card className="shadow-md glass-effect">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">My Attendance Anomalies</CardTitle>
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <AttendanceAnomalies employeeId={employeeIdForComponents} />
            </CardContent>
          </Card>
        </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 sm:gap-8 py-4 flex-grow">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-1">
            <Skeleton className="h-[250px] w-full rounded-lg" />
        </div>
        <div className="lg:col-span-2">
            <Skeleton className="h-[200px] w-full rounded-lg" /> {/* Manager Panel Skeleton */}
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-56 w-full rounded-lg" />
        <Skeleton className="h-56 w-full rounded-lg" />
      </div>
    </div>
  );
}
