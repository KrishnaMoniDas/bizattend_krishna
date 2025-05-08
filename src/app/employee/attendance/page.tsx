"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  parseISO,
} from "date-fns";
import { supabase } from "@/lib/supabaseClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Filter,
  Loader2,
  UserCheck,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface AttendanceRecord {
  id: string;
  employee_id: string;
  clock_in_time: string;
  clock_out_time: string | null;
  status: "clocked_in" | "clocked_out";
  duration_minutes?: number | null;
}

export default function EmployeeAttendancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [dateAttendance, setDateAttendance] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState({
    totalHours: 0,
    presentDays: 0,
    lateDays: 0,
  });

  // For date highlighting
  const [datesWithAttendance, setDatesWithAttendance] = useState<Date[]>([]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/employee/attendance");
    }
  }, [status, router]);

  // Get employee ID from session
  const employeeId = session?.user?.id;

  // Function to calculate attendance statistics
  const calculateStats = (records: AttendanceRecord[]) => {
    const totalHours = records.reduce((total, record) => {
      if (!record.clock_out_time || record.status !== "clocked_out")
        return total;

      const durationMinutes = record.duration_minutes || 0;
      return total + durationMinutes / 60;
    }, 0);

    // Count unique dates with attendance
    const uniqueDates = new Set();
    records.forEach((record) => {
      const date = format(parseISO(record.clock_in_time), "yyyy-MM-dd");
      uniqueDates.add(date);
    });

    // Count days with late arrival (after 9:15 AM)
    const lateDays = records.filter((record) => {
      const clockInTime = parseISO(record.clock_in_time);
      const hours = clockInTime.getHours();
      const minutes = clockInTime.getMinutes();
      return hours > 9 || (hours === 9 && minutes > 15);
    }).length;

    setStats({
      totalHours: parseFloat(totalHours.toFixed(1)),
      presentDays: uniqueDates.size,
      lateDays,
    });
  };

  // Fetch attendance records for the selected month
  const fetchMonthAttendance = useCallback(async () => {
    if (!employeeId) return;

    setIsLoading(true);
    setError(null);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    try {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("employee_id", employeeId)
        .gte("clock_in_time", monthStart.toISOString())
        .lte("clock_in_time", monthEnd.toISOString())
        .order("clock_in_time", { ascending: false });

      if (error) throw error;

      // Calculate duration for each record
      const recordsWithDuration = (data || []).map((record) => {
        let durationMinutes = null;
        if (record.clock_out_time && record.status === "clocked_out") {
          const clockInTime = parseISO(record.clock_in_time);
          const clockOutTime = parseISO(record.clock_out_time);
          durationMinutes = Math.round(
            (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60),
          );
        }
        return {
          ...record,
          duration_minutes: durationMinutes,
        };
      });

      setAttendance(recordsWithDuration);
      calculateStats(recordsWithDuration);

      // Collect all dates with attendance for highlighting
      const dates = recordsWithDuration.map((record) => {
        return parseISO(record.clock_in_time);
      });
      setDatesWithAttendance(dates);

      // Clear selected date if it exists
      if (selectedDate) {
        const filtered = recordsWithDuration.filter((record) => {
          const recordDate = parseISO(record.clock_in_time);
          return (
            recordDate.getDate() === selectedDate.getDate() &&
            recordDate.getMonth() === selectedDate.getMonth() &&
            recordDate.getFullYear() === selectedDate.getFullYear()
          );
        });
        setDateAttendance(filtered);
      } else {
        setDateAttendance([]);
      }
    } catch (err: any) {
      console.error("Error fetching attendance:", err);
      setError(
        "Failed to load attendance records: " +
          (err.message || "Unknown error"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentMonth, employeeId, selectedDate]);

  // Fetch attendance when month or employee changes
  useEffect(() => {
    if (status === "authenticated") {
      fetchMonthAttendance();
    }
  }, [fetchMonthAttendance, status]);

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);

    if (date) {
      const filtered = attendance.filter((record) => {
        const recordDate = parseISO(record.clock_in_time);
        return (
          recordDate.getDate() === date.getDate() &&
          recordDate.getMonth() === date.getMonth() &&
          recordDate.getFullYear() === date.getFullYear()
        );
      });
      setDateAttendance(filtered);
    } else {
      setDateAttendance([]);
    }
  };

  // Navigate between months
  const handlePreviousMonth = () => {
    setCurrentMonth((prevMonth) => subMonths(prevMonth, 1));
    setSelectedDate(undefined);
  };

  const handleNextMonth = () => {
    setCurrentMonth((prevMonth) => subMonths(prevMonth, -1));
    setSelectedDate(undefined);
  };

  // Highlight dates with attendance
  const isDayWithAttendance = (date: Date) => {
    return datesWithAttendance.some(
      (d) =>
        d.getDate() === date.getDate() &&
        d.getMonth() === date.getMonth() &&
        d.getFullYear() === date.getFullYear(),
    );
  };

  // Loading state
  if (status === "loading") {
    return <AttendancePageSkeleton />;
  }

  // Redirect to login if not authenticated
  if (status === "unauthenticated") {
    return null; // Will redirect via useEffect
  }

  // Show an informative screen if there's no valid employee ID
  if (!employeeId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)] p-4">
        <UserCheck className="h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Employee Attendance</h1>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          Your user account isn't properly linked to an employee record. Please
          contact your administrator.
        </p>
        <Button asChild>
          <a href="/dashboard">Return to Dashboard</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          My Attendance History
        </h1>
        <p className="text-muted-foreground">
          View and track your attendance records
        </p>
      </header>

      {/* Main content */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-6">
        {/* Calendar and date selector */}
        <Card className="md:col-span-3 glass-effect shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Attendance Calendar</CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePreviousMonth}
                  disabled={isLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  {format(currentMonth, "MMMM yyyy")}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextMonth}
                  disabled={isLoading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardDescription>
              Select a date to view detailed records
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            {isLoading ? (
              <div className="flex justify-center p-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                className="rounded-md border"
                modifiers={{
                  attendance: (date) => isDayWithAttendance(date),
                }}
                modifiersStyles={{
                  attendance: {
                    fontWeight: "bold",
                    backgroundColor: "rgba(var(--chart-1), 0.2)",
                    color: "hsl(var(--primary))",
                  },
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* Summary Statistics */}
        <Card className="md:col-span-4 glass-effect shadow-md">
          <CardHeader>
            <CardTitle>Monthly Summary</CardTitle>
            <CardDescription>
              {`Attendance summary for ${format(currentMonth, "MMMM yyyy")}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : error ? (
              <div className="p-4 text-destructive flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <StatCard
                    title="Total Hours"
                    value={`${stats.totalHours}`}
                    unit="hours"
                    icon={<Clock className="h-5 w-5" />}
                  />
                  <StatCard
                    title="Days Present"
                    value={`${stats.presentDays}`}
                    unit="days"
                    icon={<UserCheck className="h-5 w-5" />}
                  />
                  <StatCard
                    title="Late Arrivals"
                    value={`${stats.lateDays}`}
                    unit="days"
                    icon={<AlertTriangle className="h-5 w-5" />}
                    variant={stats.lateDays > 0 ? "warning" : "normal"}
                  />
                </div>

                {/* Selected Date Records */}
                {selectedDate ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">
                        Records for {format(selectedDate, "EEEE, MMMM d, yyyy")}
                      </h3>
                      {dateAttendance.length > 0 && (
                        <Button variant="outline" size="sm" disabled>
                          <FileText className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                      )}
                    </div>

                    {dateAttendance.length > 0 ? (
                      <div className="border rounded-md overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Clock In</TableHead>
                              <TableHead>Clock Out</TableHead>
                              <TableHead>Duration</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dateAttendance.map((record) => (
                              <TableRow key={record.id}>
                                <TableCell>
                                  {format(
                                    parseISO(record.clock_in_time),
                                    "h:mm a",
                                  )}
                                </TableCell>
                                <TableCell>
                                  {record.clock_out_time
                                    ? format(
                                        parseISO(record.clock_out_time),
                                        "h:mm a",
                                      )
                                    : "-"}
                                </TableCell>
                                <TableCell>
                                  {record.duration_minutes
                                    ? `${Math.floor(record.duration_minutes / 60)}h ${record.duration_minutes % 60}m`
                                    : "-"}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      record.status === "clocked_in"
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {record.status === "clocked_in"
                                      ? "Active"
                                      : "Completed"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="border rounded-md p-6 text-center text-muted-foreground">
                        <CalendarIcon className="mx-auto h-8 w-8 mb-2 opacity-50" />
                        <p>No attendance records for this date</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border rounded-md p-6 flex flex-col items-center justify-center text-center h-[260px]">
                    <CalendarIcon className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
                    <p className="text-muted-foreground">
                      Select a date on the calendar to view detailed attendance
                      records
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Attendance Records */}
        <Card className="md:col-span-7 glass-effect shadow-md">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Recent Attendance</CardTitle>
                <CardDescription>
                  Your attendance records for{" "}
                  {format(currentMonth, "MMMM yyyy")}
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" disabled>
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm" disabled>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : error ? (
              <div className="p-4 text-destructive flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            ) : attendance.length === 0 ? (
              <div className="border rounded-md p-10 text-center">
                <CalendarIcon className="mx-auto h-10 w-10 text-muted-foreground mb-3 opacity-50" />
                <p className="text-muted-foreground">
                  No attendance records found for this month
                </p>
              </div>
            ) : (
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          {format(parseISO(record.clock_in_time), "EEE, MMM d")}
                        </TableCell>
                        <TableCell>
                          {format(parseISO(record.clock_in_time), "h:mm a")}
                        </TableCell>
                        <TableCell>
                          {record.clock_out_time
                            ? format(parseISO(record.clock_out_time), "h:mm a")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {record.duration_minutes
                            ? `${Math.floor(record.duration_minutes / 60)}h ${record.duration_minutes % 60}m`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              record.status === "clocked_in"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {record.status === "clocked_in"
                              ? "Active"
                              : "Completed"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
  variant?: "normal" | "warning" | "success";
}

function StatCard({
  title,
  value,
  unit,
  icon,
  variant = "normal",
}: StatCardProps) {
  const colorClass =
    variant === "warning"
      ? "text-amber-500"
      : variant === "success"
        ? "text-green-500"
        : "text-primary";

  return (
    <div className="border rounded-md p-4 flex flex-col items-center text-center">
      <div className={`${colorClass} mb-2`}>{icon}</div>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{unit}</p>
      <p className="text-sm font-medium mt-1">{title}</p>
    </div>
  );
}

function AttendancePageSkeleton() {
  return (
    <div className="space-y-6">
      <header>
        <Skeleton className="h-8 w-72 mb-2" />
        <Skeleton className="h-4 w-64" />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-6">
        <Skeleton className="h-[450px] w-full md:col-span-3" />
        <Skeleton className="h-[450px] w-full md:col-span-4" />
        <Skeleton className="h-96 w-full md:col-span-7" />
      </div>
    </div>
  );
}
