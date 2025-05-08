"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldCheck,
  Users,
  BarChart3,
  AlertTriangle,
  Clock,
  Briefcase,
  FileText,
  ArrowRight,
  Calendar,
  CheckCircle,
  XCircle,
  User,
  CalendarClock,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { format, startOfToday, subDays } from "date-fns";
import { supabase } from "@/lib/supabaseClient";
import { PayrollSummary } from "@/components/dashboard/payroll-summary";
import { AttendanceAnomalies } from "@/components/dashboard/attendance-anomalies";

// Type definitions
interface Employee {
  id: string;
  name: string;
  department?: string;
  position?: string;
}

interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_name?: string;
  clock_in_time: string;
  clock_out_time?: string;
  status: "clocked_in" | "clocked_out";
}

export default function ManagerDashboard() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState("overview");
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>(
    [],
  );
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    pendingClockOut: 0,
  });

  const isAuthenticated = status === "authenticated";
  const isManager = session?.user?.role === "manager";
  const currentDate = new Date();

  // Fetch dashboard data
  useEffect(() => {
    if (isAuthenticated && isManager) {
      const fetchDashboardData = async () => {
        setLoading(true);

        try {
          // Fetch employee count
          const { count: employeeCount } = await supabase
            .from("employees")
            .select("*", { count: "exact", head: true });

          // Fetch employees for the dropdown
          const { data: employeeData } = await supabase
            .from("employees")
            .select("id, name, department, position")
            .order("name")
            .limit(10);

          // Fetch today's attendance records
          const today = startOfToday().toISOString();
          const { data: todayAttendance } = await supabase
            .from("attendance_records")
            .select(
              `
              id,
              employee_id,
              clock_in_time,
              clock_out_time,
              status,
              employees (name)
            `,
            )
            .gte("clock_in_time", today)
            .order("clock_in_time", { ascending: false });

          // Format attendance data
          const formattedAttendance = (todayAttendance || []).map((record) => ({
            id: record.id,
            employee_id: record.employee_id,
            employee_name: record.employees?.name,
            clock_in_time: record.clock_in_time,
            clock_out_time: record.clock_out_time,
            status: record.status,
          }));

          // Calculate stats
          const uniqueEmployeesToday = new Set(
            formattedAttendance.map((record) => record.employee_id),
          );

          const pendingClockOuts = formattedAttendance.filter(
            (record) => record.status === "clocked_in",
          ).length;

          setEmployees(employeeData || []);
          setRecentAttendance(formattedAttendance.slice(0, 5));
          setStats({
            totalEmployees: employeeCount || 0,
            presentToday: uniqueEmployeesToday.size,
            absentToday: (employeeCount || 0) - uniqueEmployeesToday.size,
            pendingClockOut: pendingClockOuts,
          });
        } catch (error) {
          console.error("Error fetching dashboard data:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchDashboardData();
    }
  }, [isAuthenticated, isManager]);

  if (status === "loading") {
    return <DashboardSkeleton />;
  }

  if (!isManager) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)] text-center space-y-4">
        <ShieldCheck className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Manager Dashboard</h1>
        <p className="text-muted-foreground max-w-md">
          You need manager privileges to access this dashboard.
        </p>
        <Button asChild>
          <Link href="/dashboard">Go to Employee Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Welcome section */}
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Manager Dashboard
          </h1>
          <p className="text-muted-foreground">
            {format(currentDate, "EEEE, MMMM do, yyyy")} | Company-wide
            attendance & payroll overview
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard">
              <User className="mr-2 h-4 w-4" />
              My Dashboard
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/admin/employees">
              <Users className="mr-2 h-4 w-4" />
              Manage Employees
            </Link>
          </Button>
        </div>
      </section>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Employees"
          value={stats.totalEmployees}
          icon={<Users className="h-5 w-5" />}
          loading={loading}
        />
        <StatCard
          title="Present Today"
          value={stats.presentToday}
          icon={<CheckCircle className="h-5 w-5" />}
          color="text-green-500"
          loading={loading}
        />
        <StatCard
          title="Absent Today"
          value={stats.absentToday}
          icon={<XCircle className="h-5 w-5" />}
          color="text-red-500"
          loading={loading}
        />
        <StatCard
          title="Pending Clock Out"
          value={stats.pendingClockOut}
          icon={<Clock className="h-5 w-5" />}
          color="text-amber-500"
          loading={loading}
        />
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-2 md:grid-cols-4 md:w-[400px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recent Attendance */}
            <Card className="shadow-md glass-effect">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-medium">
                    Recent Attendance
                  </CardTitle>
                  <CalendarClock className="h-5 w-5 text-primary" />
                </div>
                <CardDescription>
                  Latest employee clock-ins and clock-outs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : recentAttendance.length > 0 ? (
                  <div className="space-y-3">
                    {recentAttendance.map((record) => (
                      <div
                        key={record.id}
                        className="flex justify-between items-center py-2 border-b last:border-0"
                      >
                        <div>
                          <p className="font-medium">
                            {record.employee_name || "Employee"}
                          </p>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" />
                            {format(new Date(record.clock_in_time), "h:mm a")}
                            {record.clock_out_time &&
                              ` - ${format(new Date(record.clock_out_time), "h:mm a")}`}
                          </div>
                        </div>
                        <div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              record.status === "clocked_in"
                                ? "bg-green-100 text-green-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {record.status === "clocked_in" ? "In" : "Out"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center">
                    <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">
                      No recent attendance records
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/admin/attendance">
                    View All Attendance
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            {/* System Alerts */}
            <Card className="shadow-md glass-effect">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-medium">
                    System Alerts
                  </CardTitle>
                  <AlertTriangle className="h-5 w-5 text-primary" />
                </div>
                <CardDescription>
                  Important alerts requiring your attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AttendanceAnomalies employeeId="admin_view" />
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/admin/alerts">
                    View All Alerts
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Quick Access Tools */}
          <Card className="shadow-md glass-effect">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">
                Quick Access
              </CardTitle>
              <CardDescription>
                Frequently used management tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <QuickAccessItem
                  title="Employee Management"
                  icon={<Users className="h-6 w-6" />}
                  href="/admin/employees"
                  color="bg-blue-50 text-blue-600"
                />
                <QuickAccessItem
                  title="Attendance Reports"
                  icon={<FileText className="h-6 w-6" />}
                  href="/admin/reports/attendance"
                  color="bg-purple-50 text-purple-600"
                />
                <QuickAccessItem
                  title="Payroll Management"
                  icon={<Briefcase className="h-6 w-6" />}
                  href="/admin/payroll"
                  color="bg-green-50 text-green-600"
                />
                <QuickAccessItem
                  title="Analytics Dashboard"
                  icon={<BarChart3 className="h-6 w-6" />}
                  href="/admin/analytics"
                  color="bg-amber-50 text-amber-600"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4">
          <Card className="shadow-md glass-effect">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Attendance Management</CardTitle>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
              <CardDescription>
                Review and manage employee attendance records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                This feature is coming soon. Please use the overview tab for
                now.
              </p>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" asChild>
                <Link href="/admin/attendance">
                  View Full Attendance Records
                </Link>
              </Button>
              <Button disabled>Run Attendance Report</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card className="shadow-md glass-effect">
            <CardHeader>
              <CardTitle>Reports Dashboard</CardTitle>
              <CardDescription>
                Generate and view detailed reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Reports functionality is under development.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card className="shadow-md glass-effect">
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>
                View and manage all system alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AttendanceAnomalies employeeId="admin_view" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color = "text-primary",
  loading = false,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color?: string;
  loading?: boolean;
}) {
  return (
    <Card className="shadow-md glass-effect">
      <CardContent className="p-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold mt-1">{value}</p>
            )}
          </div>
          <div className={`${color}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAccessItem({
  title,
  icon,
  href,
  color = "bg-gray-50 text-gray-600",
}: {
  title: string;
  icon: React.ReactNode;
  href: string;
  color?: string;
}) {
  return (
    <Link href={href} className="block">
      <div className="border rounded-lg p-4 flex flex-col items-center text-center transition-all hover:border-primary hover:shadow-md">
        <div className={`rounded-full p-3 ${color} mb-2`}>{icon}</div>
        <p className="font-medium text-sm">{title}</p>
      </div>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-80" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-40" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>

      <div className="space-y-4">
        <Skeleton className="h-10 w-[400px] rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-80 w-full rounded-lg" />
          <Skeleton className="h-80 w-full rounded-lg" />
        </div>
        <Skeleton className="h-56 w-full rounded-lg" />
      </div>
    </div>
  );
}
