import { EmployeeManagementTable } from "@/components/admin/EmployeeManagementTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { Suspense } from "react"; // Keep Suspense for client components loading data
import { Skeleton } from "@/components/ui/skeleton";

// This page itself can be a server component
export default async function AdminEmployeesPage() {
  // Server-side logic or data fetching can happen here if needed before rendering EmployeeManagementTable
  // For example, checking permissions again, though middleware should handle primary auth.

  return (
    <div className="space-y-6 flex-grow flex flex-col">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Employee Management</h1>
          <p className="text-muted-foreground">
            Manage employee details, RFID assignments, and access.
          </p>
        </div>
      </header>
      
      <Card className="shadow-md glass-effect flex-grow flex flex-col">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Users className="h-6 w-6 text-primary" />
            <CardTitle>Employee Roster</CardTitle>
          </div>
          <CardDescription>
            View, add, edit, or remove employees from the system. Search by name or email.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
          {/* EmployeeManagementTable is a client component that fetches its own data */}
          {/* Suspense is useful if EmployeeManagementTable itself has internal async operations for initial load */}
          <Suspense fallback={<EmployeeTableSkeleton />}>
            <EmployeeManagementTable />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

function EmployeeTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
        <Skeleton className="h-10 w-full sm:w-1/3" />
        <Skeleton className="h-10 w-full sm:w-auto sm:min-w-[120px]" />
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Skeleton className="h-12 w-full" /> {/* Header row */}
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" /> 
        ))}
      </div>
      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-2">
        <Skeleton className="h-8 w-full sm:w-32" />
        <Skeleton className="h-8 w-full sm:w-48" />
      </div>
    </div>
  )
}
