import { EmployeeManagementTable } from "@/components/admin/EmployeeManagementTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { Suspense } from "react"; 
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
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <Skeleton className="h-10 w-full sm:max-w-md" />
        <Skeleton className="h-10 w-full sm:w-auto sm:min-w-[150px]" />
      </div>
      <div className="overflow-x-auto rounded-md border flex-grow">
         {/* Simulating table structure */}
        <div className="min-w-full divide-y divide-border">
            <div className="bg-muted/50"> {/* Header row */}
                <div className="flex">
                    <div className="px-4 py-3.5 flex-1"><Skeleton className="h-5 w-24" /></div>
                    <div className="px-4 py-3.5 flex-1 hidden md:block"><Skeleton className="h-5 w-32" /></div>
                    <div className="px-4 py-3.5 flex-1"><Skeleton className="h-5 w-20" /></div>
                    <div className="px-4 py-3.5 flex-1 hidden lg:block"><Skeleton className="h-5 w-16" /></div>
                    <div className="px-4 py-3.5 flex-1 hidden lg:block"><Skeleton className="h-5 w-16" /></div>
                    <div className="px-4 py-3.5 w-20 text-right"><Skeleton className="h-8 w-8 ml-auto rounded-full" /></div>
                </div>
            </div>
            <div> {/* Body rows */}
            {[...Array(5)].map((_, i) => (
                 <div key={i} className="flex border-b border-border last:border-b-0">
                    <div className="px-4 py-3.5 flex-1"><Skeleton className="h-5 w-3/4" /></div>
                    <div className="px-4 py-3.5 flex-1 hidden md:block"><Skeleton className="h-5 w-3/4" /></div>
                    <div className="px-4 py-3.5 flex-1"><Skeleton className="h-5 w-1/2" /></div>
                    <div className="px-4 py-3.5 flex-1 hidden lg:block"><Skeleton className="h-5 w-1/2" /></div>
                    <div className="px-4 py-3.5 flex-1 hidden lg:block"><Skeleton className="h-5 w-1/2" /></div>
                    <div className="px-4 py-3.5 w-20 text-right flex justify-end items-center"><Skeleton className="h-8 w-8 rounded-full" /></div>
                </div>
            ))}
            </div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-2">
        <Skeleton className="h-8 w-full sm:w-40" /> {/* Pagination info */}
        <div className="flex gap-2 w-full sm:w-auto">
            <Skeleton className="h-9 w-1/2 sm:w-24" /> {/* Prev button */}
            <Skeleton className="h-9 w-1/2 sm:w-24" /> {/* Next button */}
        </div>
      </div>
    </div>
  );
}
