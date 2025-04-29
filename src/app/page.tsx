import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Briefcase } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-background to-secondary">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="items-center text-center">
          <Briefcase className="h-12 w-12 text-primary mb-4" />
          <CardTitle className="text-3xl font-bold text-primary">Welcome to BizAttend</CardTitle>
          <CardDescription className="text-muted-foreground">
            Your Plug-and-Play Digital Attendance & Payroll System.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          <p className="text-center">
            Simplify your workforce management with easy clock-ins, automated payroll, and smart anomaly detection.
          </p>
          <Button asChild className="w-full" variant="default">
            {/* In a real app, this would likely check auth status and redirect */}
            {/* For now, let's link to a placeholder dashboard */}
            <Link href="/dashboard">Get Started</Link>
          </Button>
           {/* Add login/signup links later */}
           {/*
           <div className="text-sm text-muted-foreground">
             Already have an account? <Link href="/login" className="underline text-primary">Login</Link>
           </div>
           */}
        </CardContent>
      </Card>
    </main>
  );
}
