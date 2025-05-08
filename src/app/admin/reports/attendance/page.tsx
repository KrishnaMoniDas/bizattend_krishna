"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  CalendarRange,
  Download,
  FileText,
  Loader2,
  PieChart,
  ShieldCheck,
} from "lucide-react";

const reports = [
  {
    id: "daily",
    title: "Daily Attendance",
    description:
      "Clock-in and clock-out records for each employee on a daily basis.",
    icon: <CalendarRange className="h-6 w-6" />,
    comingSoon: false,
  },
  {
    id: "summary",
    title: "Monthly Summary",
    description:
      "Total hours worked, overtime, and attendance rate for all employees.",
    icon: <BarChart3 className="h-6 w-6" />,
    comingSoon: false,
  },
  {
    id: "department",
    title: "Department Analytics",
    description: "Attendance and tardiness data broken down by department.",
    icon: <PieChart className="h-6 w-6" />,
    comingSoon: true,
  },
  {
    id: "tardiness",
    title: "Tardiness Report",
    description:
      "Track late arrivals and early departures across the workforce.",
    icon: <FileText className="h-6 w-6" />,
    comingSoon: true,
  },
];

export default function AttendanceReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [startDate, setStartDate] = useState<string>(
    format(new Date(), "yyyy-MM-01"), // First day of current month
  );
  const [endDate, setEndDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd"), // Today
  );
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Check if user is manager
  const isManager = session?.user?.role === "manager";

  // Redirect if not authenticated or not manager
  if (status === "loading") {
    return <ReportsPageSkeleton />;
  }

  if (status === "unauthenticated") {
    router.push("/login?callbackUrl=/admin/reports/attendance");
    return null;
  }

  if (status === "authenticated" && !isManager) {
    router.push("/dashboard");
    return null;
  }

  // Simulate report generation
  const handleGenerateReport = () => {
    if (!selectedReport) return;

    setIsGenerating(true);

    // Simulate API call delay
    setTimeout(() => {
      setIsGenerating(false);
      // In a real app, this would trigger a download or redirect to the report
      alert(
        `Generated ${selectedReport} report from ${startDate} to ${endDate}`,
      );
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Attendance Reports
        </h1>
        <p className="text-muted-foreground">
          Generate and download attendance reports
        </p>
      </header>

      {/* Report Generator */}
      <Card className="glass-effect shadow-md">
        <CardHeader>
          <CardTitle>Report Generator</CardTitle>
          <CardDescription>Select a date range and report type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Report Type</Label>
              <div className="grid gap-3">
                {reports.map((report) => (
                  <Button
                    key={report.id}
                    variant={
                      selectedReport === report.id ? "default" : "outline"
                    }
                    className={`justify-start text-left h-auto py-3 px-4 ${
                      report.comingSoon ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                    onClick={() =>
                      !report.comingSoon && setSelectedReport(report.id)
                    }
                    disabled={report.comingSoon}
                  >
                    <div className="flex items-center gap-3">
                      {report.icon}
                      <div>
                        <p className="font-medium text-base">
                          {report.title}
                          {report.comingSoon && (
                            <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">
                              Coming Soon
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {report.description}
                        </p>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <p className="text-sm text-muted-foreground">
            Reports are generated in Excel format
          </p>
          <Button
            onClick={handleGenerateReport}
            disabled={!selectedReport || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Generate Report
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Recent Reports */}
      <Card className="glass-effect shadow-md">
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
          <CardDescription>Previously generated reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="flex flex-col items-center justify-center p-10 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
              <p className="text-muted-foreground mb-2">
                No recent reports found
              </p>
              <p className="text-sm text-muted-foreground">
                Generate a report to see it here
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReportsPageSkeleton() {
  return (
    <div className="space-y-6">
      <header>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-80" />
      </header>

      <Skeleton className="h-[400px] w-full" />
      <Skeleton className="h-[200px] w-full" />
    </div>
  );
}
