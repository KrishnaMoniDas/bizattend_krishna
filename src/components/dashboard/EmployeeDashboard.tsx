"use client";

import React from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { RfidClockPrompt } from "@/components/dashboard/rfid-clock-prompt";
import { PayrollSummary } from "@/components/dashboard/payroll-summary";
import { AttendanceAnomalies } from "@/components/dashboard/attendance-anomalies";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  IndianRupee,
  Clock,
  CalendarDays,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function EmployeeDashboard() {
  const { data: session, status } = useSession();
  const currentDate = new Date();

  if (status === "loading") {
    return <DashboardSkeleton />;
  }

  const employeeId = session?.user?.id || "current_user_placeholder";
  const isAuthenticated = status === "authenticated";
  const userName = session?.user?.name || "Employee";

  return (
    <div className="space-y-6 pb-8">
      {/* Welcome section */}
      <section className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          {isAuthenticated ? `Welcome, ${userName}` : "Welcome to BizAttend"}
        </h1>
        <p className="text-muted-foreground">
          {format(currentDate, "EEEE, MMMM do, yyyy")} | Your attendance &
          payroll dashboard
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RFID Clock-in */}
        <div className="lg:col-span-1">
          <Card className="shadow-md glass-effect h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium">
                  Clock In/Out
                </CardTitle>
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <CardDescription>
                Scan your RFID badge to record attendance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RfidClockPrompt />
            </CardContent>
          </Card>
        </div>

        {/* Summary Cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payroll Summary Card */}
          <Card className="shadow-md glass-effect">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium">
                  My Payroll Summary
                </CardTitle>
                <IndianRupee className="h-5 w-5 text-primary" />
              </div>
              <CardDescription>
                Current pay period earnings estimate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PayrollSummary employeeId={employeeId} />
            </CardContent>
          </Card>

          {/* Attendance Anomalies Card */}
          <Card className="shadow-md glass-effect">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium">
                  Attendance Alerts
                </CardTitle>
                <AlertTriangle className="h-5 w-5 text-primary" />
              </div>
              <CardDescription>
                Irregularities detected in your attendance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AttendanceAnomalies employeeId={employeeId} />
            </CardContent>
          </Card>

          {/* Attendance History Card with link to full view */}
          <Card className="shadow-md glass-effect">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium">
                  Attendance History
                </CardTitle>
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <CardDescription>Your recent attendance records</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isAuthenticated ? (
                <div className="p-4 text-center bg-muted/50 rounded-lg">
                  <p className="text-muted-foreground">
                    Log in to view your attendance history
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <AttendanceHistorySummary employeeId={employeeId} />
                  </div>
                  <Button variant="outline" className="w-full group" asChild>
                    <Link href="/employee/attendance">
                      View Full Attendance History
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Placeholder component - would be implemented to show recent attendance
function AttendanceHistorySummary({ employeeId }: { employeeId: string }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center text-sm py-2 border-b">
        <div className="flex items-center">
          <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
          <span>Today</span>
        </div>
        <div className="text-right">
          <span className="text-primary font-medium">8:32 AM - Present</span>
        </div>
      </div>
      <div className="flex justify-between items-center text-sm py-2 border-b">
        <div className="flex items-center">
          <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
          <span>Yesterday</span>
        </div>
        <div className="text-right">
          <span className="text-muted-foreground">9:01 AM - 5:45 PM</span>
        </div>
      </div>
      <div className="flex justify-between items-center text-sm py-2 border-b">
        <div className="flex items-center">
          <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
          <span>Wednesday</span>
        </div>
        <div className="text-right">
          <span className="text-muted-foreground">8:45 AM - 5:30 PM</span>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-80" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Skeleton className="h-[350px] w-full rounded-lg" />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-56 w-full rounded-lg" />
          <Skeleton className="h-56 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
