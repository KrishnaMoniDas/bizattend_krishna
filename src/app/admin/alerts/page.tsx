"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock,
  FilterX,
  Loader2,
  MailWarning,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { AttendanceAnomalies } from "@/components/dashboard/attendance-anomalies";
import { format, subDays } from "date-fns";

// Additional anomaly types for demo purposes
const systemAlerts = [
  {
    id: "system-1",
    type: "system",
    severity: "high",
    title: "Database Backup Failed",
    description:
      "The scheduled database backup failed to complete. Please check the server logs.",
    timestamp: subDays(new Date(), 1).toISOString(),
    acknowledged: false,
  },
  {
    id: "system-2",
    type: "system",
    severity: "medium",
    title: "Storage Capacity Warning",
    description:
      "The system storage is at 85% capacity. Consider cleaning up old logs and data.",
    timestamp: subDays(new Date(), 3).toISOString(),
    acknowledged: true,
  },
  {
    id: "system-3",
    type: "system",
    severity: "low",
    title: "SSL Certificate Expiration",
    description:
      "The SSL certificate will expire in 30 days. Renewal recommended.",
    timestamp: subDays(new Date(), 5).toISOString(),
    acknowledged: false,
  },
];

const payrollAlerts = [
  {
    id: "payroll-1",
    type: "payroll",
    severity: "high",
    title: "Overtime Hours Exceeded",
    description:
      "Several employees have exceeded their authorized overtime hours this month.",
    timestamp: subDays(new Date(), 2).toISOString(),
    acknowledged: false,
  },
  {
    id: "payroll-2",
    type: "payroll",
    severity: "medium",
    title: "Missing Rate Information",
    description:
      "Some employees are missing hourly rate information, which may affect payroll calculations.",
    timestamp: subDays(new Date(), 4).toISOString(),
    acknowledged: false,
  },
];

export default function AdminAlertsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("attendance");
  const [isLoading, setIsLoading] = useState(true);
  const [systemNotifications, setSystemNotifications] = useState(systemAlerts);
  const [payrollNotifications, setPayrollNotifications] =
    useState(payrollAlerts);

  // Check if user is manager
  const isManager = session?.user?.role === "manager";

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Redirect if not authenticated or not manager
  if (status === "loading") {
    return <AlertsPageSkeleton />;
  }

  if (status === "unauthenticated") {
    router.push("/login?callbackUrl=/admin/alerts");
    return null;
  }

  if (status === "authenticated" && !isManager) {
    router.push("/dashboard");
    return null;
  }

  // Handle acknowledging alerts
  const handleAcknowledge = (type: string, id: string) => {
    if (type === "system") {
      setSystemNotifications((prev) =>
        prev.map((alert) =>
          alert.id === id ? { ...alert, acknowledged: true } : alert,
        ),
      );
    } else if (type === "payroll") {
      setPayrollNotifications((prev) =>
        prev.map((alert) =>
          alert.id === id ? { ...alert, acknowledged: true } : alert,
        ),
      );
    }
  };

  // Handle dismissing alerts
  const handleDismiss = (type: string, id: string) => {
    if (type === "system") {
      setSystemNotifications((prev) => prev.filter((alert) => alert.id !== id));
    } else if (type === "payroll") {
      setPayrollNotifications((prev) =>
        prev.filter((alert) => alert.id !== id),
      );
    }
  };

  // Calculate alert counts
  const getActiveAlertCount = (type: string) => {
    if (type === "system") {
      return systemNotifications.filter((alert) => !alert.acknowledged).length;
    } else if (type === "payroll") {
      return payrollNotifications.filter((alert) => !alert.acknowledged).length;
    }
    return 0;
  };

  // Get severity icon
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "high":
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case "medium":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "low":
        return <Bell className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            System Alerts
          </h1>
          <p className="text-muted-foreground">
            View and manage system notifications and alerts
          </p>
        </div>
        <Button onClick={() => window.location.reload()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </header>

      {/* Alerts Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AlertSummaryCard
          title="Attendance Alerts"
          description="Anomalies in employee attendance patterns"
          icon={<Clock className="h-5 w-5 text-primary" />}
          count={2}
          loading={isLoading}
          active={activeTab === "attendance"}
          onClick={() => setActiveTab("attendance")}
        />
        <AlertSummaryCard
          title="System Notifications"
          description="Technical issues and system notices"
          icon={<ShieldCheck className="h-5 w-5 text-blue-500" />}
          count={getActiveAlertCount("system")}
          loading={isLoading}
          active={activeTab === "system"}
          onClick={() => setActiveTab("system")}
        />
        <AlertSummaryCard
          title="Payroll Warnings"
          description="Issues affecting payroll calculations"
          icon={<MailWarning className="h-5 w-5 text-amber-500" />}
          count={getActiveAlertCount("payroll")}
          loading={isLoading}
          active={activeTab === "payroll"}
          onClick={() => setActiveTab("payroll")}
        />
      </div>

      {/* Main Alerts Tab Content */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-3 md:w-[400px]">
          <TabsTrigger value="attendance">
            Attendance
            <Badge className="ml-2" variant="outline">
              2
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="system">
            System
            <Badge className="ml-2" variant="outline">
              {getActiveAlertCount("system")}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="payroll">
            Payroll
            <Badge className="ml-2" variant="outline">
              {getActiveAlertCount("payroll")}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Attendance Anomalies Tab */}
        <TabsContent value="attendance" className="space-y-4">
          <Card className="glass-effect shadow-md">
            <CardHeader>
              <CardTitle>Attendance Anomalies</CardTitle>
              <CardDescription>
                AI-detected unusual attendance patterns that may require
                attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : (
                <AttendanceAnomalies employeeId="admin_view" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Notifications Tab */}
        <TabsContent value="system" className="space-y-4">
          <Card className="glass-effect shadow-md">
            <CardHeader>
              <CardTitle>System Notifications</CardTitle>
              <CardDescription>
                Technical alerts and system status notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : systemNotifications.length > 0 ? (
                systemNotifications.map((alert) => (
                  <NotificationAlert
                    key={alert.id}
                    icon={getSeverityIcon(alert.severity)}
                    title={alert.title}
                    description={alert.description}
                    timestamp={alert.timestamp}
                    acknowledged={alert.acknowledged}
                    onAcknowledge={() => handleAcknowledge("system", alert.id)}
                    onDismiss={() => handleDismiss("system", alert.id)}
                  />
                ))
              ) : (
                <div className="border rounded-md p-10 text-center">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-green-500 mb-3 opacity-70" />
                  <p className="text-muted-foreground">
                    No system notifications at this time
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll Warnings Tab */}
        <TabsContent value="payroll" className="space-y-4">
          <Card className="glass-effect shadow-md">
            <CardHeader>
              <CardTitle>Payroll Warnings</CardTitle>
              <CardDescription>
                Issues that may affect payroll processing and accuracy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : payrollNotifications.length > 0 ? (
                payrollNotifications.map((alert) => (
                  <NotificationAlert
                    key={alert.id}
                    icon={getSeverityIcon(alert.severity)}
                    title={alert.title}
                    description={alert.description}
                    timestamp={alert.timestamp}
                    acknowledged={alert.acknowledged}
                    onAcknowledge={() => handleAcknowledge("payroll", alert.id)}
                    onDismiss={() => handleDismiss("payroll", alert.id)}
                  />
                ))
              ) : (
                <div className="border rounded-md p-10 text-center">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-green-500 mb-3 opacity-70" />
                  <p className="text-muted-foreground">
                    No payroll warnings at this time
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Alert History & Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass-effect shadow-md">
          <CardHeader>
            <CardTitle>Alert History</CardTitle>
            <CardDescription>
              Previously acknowledged and resolved alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="rounded-md border">
                <div className="flex flex-col items-center justify-center p-10 text-center">
                  <FilterX className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
                  <p className="text-muted-foreground">
                    No historical alerts to display
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-effect shadow-md">
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>
              Configure alert thresholds and notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="rounded-md border">
                <div className="flex flex-col items-center justify-center p-10 text-center">
                  <Bell className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
                  <p className="text-muted-foreground">
                    Notification settings will be available in a future update
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Alert Summary Card Component
function AlertSummaryCard({
  title,
  description,
  icon,
  count,
  loading = false,
  active = false,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  count: number;
  loading?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Card
      className={`shadow-md glass-effect cursor-pointer hover:shadow-lg transition-all ${
        active ? "border-primary" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {icon}
              <h3 className="font-medium">{title}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          {loading ? (
            <Skeleton className="h-8 w-8 rounded-full" />
          ) : (
            <div
              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                count > 0
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {count}
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center justify-end text-sm">
          <span className="text-primary font-medium">View details</span>
          <ChevronDown className="ml-1 h-4 w-4 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}

// Notification Alert Component
function NotificationAlert({
  icon,
  title,
  description,
  timestamp,
  acknowledged = false,
  onAcknowledge,
  onDismiss,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  timestamp: string;
  acknowledged?: boolean;
  onAcknowledge?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <Alert className={`relative ${acknowledged ? "opacity-60" : ""}`}>
      {icon}
      <AlertTitle className="flex items-center justify-between mr-8">
        {title}
        {acknowledged && (
          <span className="text-xs font-normal bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
            Acknowledged
          </span>
        )}
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p>{description}</p>
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>
            Reported {format(new Date(timestamp), "MMM d, yyyy • h:mm a")}
          </span>
          {!acknowledged ? (
            <div className="flex gap-2">
              <Button
                onClick={onAcknowledge}
                variant="outline"
                size="sm"
                className="h-7 px-2"
              >
                <UserCheck className="h-3.5 w-3.5 mr-1" />
                Acknowledge
              </Button>
              <Button
                onClick={onDismiss}
                variant="ghost"
                size="sm"
                className="h-7 px-2"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Dismiss
              </Button>
            </div>
          ) : (
            <Button
              onClick={onDismiss}
              variant="ghost"
              size="sm"
              className="h-7 px-2"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Remove
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

function AlertsPageSkeleton() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-80" />
        </div>
        <Skeleton className="h-9 w-32" />
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>

      <Skeleton className="h-10 w-[400px]" />
      <Skeleton className="h-96 w-full" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
