import { ClockInComponent } from "@/components/dashboard/clock-in";
import { PayrollSummary } from "@/components/dashboard/payroll-summary";
import { AttendanceAnomalies } from "@/components/dashboard/attendance-anomalies";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Clock, AlertTriangle, IndianRupee } from "lucide-react";

export default function DashboardPage() {
  // Example data - replace with actual data fetching
  const employeeId = "EMP123"; // Fetch current user's employee ID

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
       {/* Simple Header for now */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <div className="flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">BizAttend Dashboard</h1>
        </div>
        {/* Add User Profile Dropdown later */}
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clock In / Out</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <ClockInComponent employeeId={employeeId} />
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payroll Summary (Current Period)</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
               {/* Pass necessary dates or fetch within component */}
              <PayrollSummary employeeId={employeeId} />
            </CardContent>
          </Card>
           <Card className="shadow-sm md:col-span-2 lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance Anomalies</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {/* Needs logic to fetch recent attendance records */}
              <AttendanceAnomalies employeeId={employeeId} />
            </CardContent>
          </Card>
        </div>
         {/* Could add more sections like detailed timesheets, reports etc. */}
      </main>
    </div>
  );
}
