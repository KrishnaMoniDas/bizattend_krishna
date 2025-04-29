import { EmployeeRegistration } from "@/components/dashboard/employee-registration";
import { RfidClockPrompt } from "@/components/dashboard/rfid-clock-prompt";
import { PayrollSummary } from "@/components/dashboard/payroll-summary";
import { AttendanceAnomalies } from "@/components/dashboard/attendance-anomalies";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, AlertTriangle, IndianRupee, UserPlus, Nfc } from "lucide-react";

export default function DashboardPage() {
  // Example data - replace with actual data fetching/context or role-based logic
  const isAdmin = true; // Example admin status to show registration

  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-br from-background via-secondary/30 to-background">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border/40 bg-background/80 backdrop-blur-sm px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <div className="flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">BizAttend Dashboard</h1>
        </div>
        {/* User Profile Dropdown placeholder */}
      </header>

      <main className="flex flex-1 flex-col gap-6 p-4 sm:px-6 md:gap-8">
         {/* RFID Clock-in Section - Takes full width initially */}
         <div className="w-full max-w-md mx-auto"> {/* Center the RFID prompt */}
             <RfidClockPrompt />
         </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 flex-grow">
          {/* Employee Registration (Admin Only) */}
          {isAdmin && (
            <Card className="lg:col-span-1"> {/* Use standard Card */}
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
           {/* Pass a relevant identifier if needed, or fetch based on logged-in user/context */}
          <Card> {/* Use standard Card */}
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payroll Summary (Current Period)</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {/* PayrollSummary might need admin/user context to fetch appropriate data */}
              <PayrollSummary employeeId={"admin_view"} /> {/* Example: indicates admin viewing summary */}
            </CardContent>
          </Card>

          {/* Attendance Anomalies */}
          <Card> {/* Use standard Card */}
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance Anomalies</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {/* Adjust anomaly fetching based on admin/user role */}
              <AttendanceAnomalies employeeId={"admin_view"} />{/* Example: indicates admin viewing summary */}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
