import { EmployeeRegistration } from "@/components/dashboard/employee-registration";
import { RfidClockPrompt } from "@/components/dashboard/rfid-clock-prompt";
import { PayrollSummary } from "@/components/dashboard/payroll-summary";
import { AttendanceAnomalies } from "@/components/dashboard/attendance-anomalies";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Clock, AlertTriangle, IndianRupee, UserPlus, Nfc } from "lucide-react";

export default function DashboardPage() {
  // Example data - replace with actual data fetching/context
  const employeeId = "EMP123"; // This might become less relevant if clock-in is purely RFID based
  const isAdmin = true; // Example admin status to show registration

  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-br from-background to-secondary/50">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border/50 bg-background/80 backdrop-blur-sm px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <div className="flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">BizAttend Dashboard</h1>
        </div>
        {/* User Profile Dropdown placeholder */}
      </header>

      <main className="flex flex-1 flex-col gap-6 p-4 sm:px-6 md:gap-8">
         {/* RFID Clock-in Section */}
         <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RFID Clock In/Out</CardTitle>
            <Nfc className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {/* This component will handle the interaction with the ESP32/RFID reader */}
            <RfidClockPrompt />
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Employee Registration (Admin Only) */}
          {isAdmin && (
            <Card className="shadow-sm lg:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Manage Employees</CardTitle>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <EmployeeRegistration />
              </CardContent>
            </Card>
          )}

          {/* Payroll Summary */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payroll Summary (Current Period)</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <PayrollSummary employeeId={employeeId} /> {/* Might need adjustment based on logged-in user/admin view */}
            </CardContent>
          </Card>

          {/* Attendance Anomalies */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance Anomalies</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {/* Adjust anomaly fetching based on admin/user role */}
              <AttendanceAnomalies employeeId={employeeId} />
            </CardContent>
          </Card>

           {/* Removed the manual ClockInComponent */}
        </div>
         {/* Further sections like timesheets, reports can be added */}
      </main>
    </div>
  );
}
