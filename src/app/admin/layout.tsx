"use client";

import { PropsWithChildren } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Users,
  CalendarClock,
  FileText,
  AlertTriangle,
  Loader2,
} from "lucide-react";

export default function AdminLayout({ children }: PropsWithChildren) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const isManager = session?.user?.role === "manager";

  // Redirect if not authenticated or not manager
  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading admin panel...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login?callbackUrl=" + pathname);
    return null;
  }

  if (status === "authenticated" && !isManager) {
    router.push("/dashboard");
    return null;
  }

  // Determine active tab
  const getActiveTab = () => {
    if (pathname.includes("/admin/employees")) return "employees";
    if (pathname.includes("/admin/attendance")) return "attendance";
    if (pathname.includes("/admin/reports")) return "reports";
    if (pathname.includes("/admin/alerts")) return "alerts";
    return "employees";
  };

  const activeTab = getActiveTab();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>

        <Tabs value={activeTab} className="w-full sm:w-auto">
          <TabsList className="grid grid-cols-4 w-full sm:w-[600px]">
            <TabsTrigger value="employees" asChild>
              <Link href="/admin/employees" className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span className="hidden md:inline">Employees</span>
              </Link>
            </TabsTrigger>
            <TabsTrigger value="attendance" asChild>
              <Link
                href="/admin/attendance"
                className="flex items-center gap-1"
              >
                <CalendarClock className="h-4 w-4" />
                <span className="hidden md:inline">Attendance</span>
              </Link>
            </TabsTrigger>
            <TabsTrigger value="reports" asChild>
              <Link
                href="/admin/reports/attendance"
                className="flex items-center gap-1"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden md:inline">Reports</span>
              </Link>
            </TabsTrigger>
            <TabsTrigger value="alerts" asChild>
              <Link href="/admin/alerts" className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden md:inline">Alerts</span>
              </Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {children}
    </div>
  );
}
