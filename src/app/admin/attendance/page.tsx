"use client";

import { useState, useEffect, useCallback } from "react";
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
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  BarChart3,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
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

interface Employee {
  id: string;
  name: string;
  department?: string | null;
}

interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  department?: string | null;
  clock_in_time: string;
  clock_out_time: string | null;
  status: "clocked_in" | "clocked_out";
  duration_minutes?: number | null;
}

export default function AdminAttendancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [dateAttendance, setDateAttendance] = useState<AttendanceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [stats, setStats] = useState({
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    totalEmployees: 0,
  });

  // Check if user is manager
  const isManager = session?.user?.role === "manager";

  // Redirect to dashboard if not manager
  useEffect(() => {
    if (status === "authenticated" && !isManager) {
      router.push("/dashboard");
    }
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/admin/attendance");
    }
  }, [status, router, isManager]);

  // Fetch employees list
  const fetchEmployees = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, department")
        .order("name");

      if (error) throw error;

      setEmployees(data || []);
      setStats((prevStats) => ({
        ...prevStats,
        totalEmployees: data?.length || 0,
      }));
    } catch (err: any) {
      console.error("Error fetching employees:", err);
    }
  }, []);

  // Fetch attendance records for the selected month
  const fetchAttendance = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    try {
      // First, fetch employees if not already loaded
      if (employees.length === 0) {
        await fetchEmployees();
      }

      // Then fetch attendance records with employee details
      const { data, error } = await supabase
        .from("attendance_records")
        .select(
          `
          id,
          employee_id,
          clock_in_time,
          clock_out_time,
          status,
          employees (name, department)
        `,
        )
        .gte("clock_in_time", monthStart.toISOString())
        .lte("clock_in_time", monthEnd.toISOString())
        .order("clock_in_time", { ascending: false });

      if (error) throw error;

      // Calculate duration and format data
      const recordsWithDetails = (data || []).map((record) => {
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
          employee_name: record.employees?.name || "Unknown",
          department: record.employees?.department || null,
          duration_minutes: durationMinutes,
        };
      });

      // Apply department filter if set
      const filteredRecords =
        departmentFilter !== "all"
          ? recordsWithDetails.filter(
              (record) => record.department === departmentFilter,
            )
          : recordsWithDetails;

      // Apply search filter if set
      const searchedRecords = searchTerm
        ? filteredRecords.filter((record) =>
            record.employee_name
              .toLowerCase()
              .includes(searchTerm.toLowerCase()),
          )
        : filteredRecords;

      setAttendance(searchedRecords);

      // Update date-specific attendance if a date is selected
      if (selectedDate) {
        const filtered = searchedRecords.filter((record) => {
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

      // Calculate today's statistics
      const today = new Date();
      const todayString = format(today, "yyyy-MM-dd");

      const todayRecords = recordsWithDetails.filter(
        (record) =>
          format(parseISO(record.clock_in_time), "yyyy-MM-dd") === todayString,
      );

      const uniquePresentEmployees = new Set(
        todayRecords.map((record) => record.employee_id),
      );

      const lateRecords = todayRecords.filter((record) => {
        const clockInTime = parseISO(record.clock_in_time);
        const hours = clockInTime.getHours();
        const minutes = clockInTime.getMinutes();
        return hours > 9 || (hours === 9 && minutes > 15);
      });

      setStats({
        presentToday: uniquePresentEmployees.size,
        absentToday: (employees.length || 0) - uniquePresentEmployees.size,
        lateToday: lateRecords.length,
        totalEmployees: employees.length || 0,
      });
    } catch (err: any) {
      console.error("Error fetching attendance:", err);
      setError(
        "Failed to load attendance records: " +
          (err.message || "Unknown error"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    currentMonth,
    employees,
    fetchEmployees,
    departmentFilter,
    searchTerm,
    selectedDate,
  ]);

  // Get unique departments for filter
  const departments = useMemo(() => {
    const deptSet = new Set<string>();
    employees.forEach((emp) => {
      if (emp.department) deptSet.add(emp.department);
    });
    return ["all", ...Array.from(deptSet)];
  }, [employees]);

  // Fetch attendance when relevant dependencies change
  useEffect(() => {
    if (status === "authenticated" && isManager) {
      fetchAttendance();
    }
  }, [fetchAttendance, status, isManager]);

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

  // Refresh data
  const handleRefresh = () => {
    fetchAttendance();
  };

  // Loading state
  if (status === "loading") {
    return <AttendancePageSkeleton />;
  }

  // Redirect if not authenticated or not manager
  if (
    status === "unauthenticated" ||
    (status === "authenticated" && !isManager)
  ) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Attendance Management
          </h1>
          <p className="text-muted-foreground">
            Company-wide attendance tracking and reports
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" disabled={isLoading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Employees"
          value={stats.totalEmployees}
          icon={<Users className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatCard
          title="Present Today"
          value={stats.presentToday}
          icon={<UserCheck className="h-5 w-5" />}
          color="text-green-500"
          loading={isLoading}
        />
        <StatCard
          title="Absent Today"
          value={stats.absentToday}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="text-red-500"
          loading={isLoading}
        />
        <StatCard
          title="Late Arrivals Today"
          value={stats.lateToday}
          icon={<Clock className="h-5 w-5" />}
          color="text-amber-500"
          loading={isLoading}
        />
      </div>

      {/* Filters and Controls */}
      <Card className="glass-effect shadow-md">
        <CardHeader className="pb-3">
          <CardTitle>Attendance Filters</CardTitle>
          <CardDescription>
            Filter attendance records by date, department, or search for
            specific employees
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Month</label>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePreviousMonth}
                  disabled={isLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[120px] text-center">
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Department</label>
              <Select
                value={departmentFilter}
                onValueChange={setDepartmentFilter}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept, index) => (
                    <SelectItem key={index} value={dept}>
                      {dept === "all" ? "All Departments" : dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Employee Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by employee name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main content */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-6">
        {/* Calendar for date selection */}
        <Card className="md:col-span-3 glass-effect shadow-md">
          <CardHeader className="pb-3">
            <CardTitle>Attendance Calendar</CardTitle>
            <CardDescription>
              Select a date to view specific attendance records
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
              />
            )}
          </CardContent>
        </Card>

        {/* Selected Date Records */}
        <Card className="md:col-span-4 glass-effect shadow-md">
          <CardHeader>
            <CardTitle>
              {selectedDate
                ? `Attendance for ${format(selectedDate, "EEEE, MMMM d, yyyy")}`
                : "Daily Attendance View"}
            </CardTitle>
            <CardDescription>
              {selectedDate
                ? `${dateAttendance.length} attendance records for the selected date`
                : "Select a date on the calendar to view attendance details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : error ? (
              <div className="p-4 text-destructive flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            ) : selectedDate ? (
              dateAttendance.length > 0 ? (
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Clock In</TableHead>
                        <TableHead>Clock Out</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dateAttendance.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">
                            {record.employee_name}
                          </TableCell>
                          <TableCell>{record.department || "N/A"}</TableCell>
                          <TableCell>
                            {format(parseISO(record.clock_in_time), "h:mm a")}
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
                <div className="border rounded-md p-10 text-center">
                  <CalendarIcon className="mx-auto h-10 w-10 text-muted-foreground mb-3 opacity-50" />
                  <p className="text-muted-foreground">
                    No attendance records for this date
                  </p>
                </div>
              )
            ) : (
              <div className="border rounded-md p-10 text-center">
                <CalendarIcon className="mx-auto h-10 w-10 text-muted-foreground mb-3 opacity-50" />
                <p className="text-muted-foreground">
                  Select a date on the calendar to view attendance details
                </p>
              </div>
            )}
          </CardContent>
          {selectedDate && dateAttendance.length > 0 && (
            <CardFooter>
              <Button variant="outline" size="sm" className="ml-auto" disabled>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Monthly Attendance Table */}
        <Card className="md:col-span-7 glass-effect shadow-md">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Attendance Records</CardTitle>
                <CardDescription>
                  Complete attendance records for{" "}
                  {format(currentMonth, "MMMM yyyy")}
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" asChild disabled>
                  <span>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analytics
                  </span>
                </Button>
                <Button variant="outline" size="sm" asChild disabled>
                  <span>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </span>
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
                  No attendance records found for the selected criteria
                </p>
              </div>
            ) : (
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
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
                          {format(
                            parseISO(record.clock_in_time),
                            "MMM d, yyyy",
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {record.employee_name}
                        </TableCell>
                        <TableCell>{record.department || "N/A"}</TableCell>
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

// Helper for stat cards
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

function AttendancePageSkeleton() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-80" />
        </div>
        <Skeleton className="h-9 w-32" />
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>

      <Skeleton className="h-32 w-full" />

      <div className="grid grid-cols-1 md:grid-cols-7 gap-6">
        <Skeleton className="h-[450px] w-full md:col-span-3" />
        <Skeleton className="h-[450px] w-full md:col-span-4" />
        <Skeleton className="h-96 w-full md:col-span-7" />
      </div>
    </div>
  );
}

const memoize = (fn) => {
  const cache = {};
  return (...args) => {
    const key = JSON.stringify(args);
    if (key in cache) {
      return cache[key];
    }
    const result = fn(...args);
    cache[key] = result;
    return result;
  };
};
