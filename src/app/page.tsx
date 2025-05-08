import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Briefcase, LogIn, CheckCircle, Users, DollarSign, AlertTriangleIcon } from "lucide-react";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center bg-gradient-to-br from-background via-secondary/10 to-background p-4 md:p-8 text-center min-h-[calc(100vh-4rem)]"> {/* Adjusted min-height */}
      <Card className="w-full max-w-3xl shadow-2xl glass-effect overflow-hidden my-8">
        <div className="relative h-56 md:h-72 w-full">
          <Image
            src="https://picsum.photos/1000/400?random=1"
            alt="BizAttend system showing attendance tracking"
            layout="fill"
            objectFit="cover"
            priority
            data-ai-hint="office technology"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-primary/30 to-transparent" />
           <div className="absolute bottom-0 left-0 p-6 md:p-8">
             <h1 className="text-4xl md:text-5xl font-extrabold text-primary-foreground shadow-strong">
               BizAttend
             </h1>
             <p className="text-lg md:text-xl text-primary-foreground/90 mt-1 shadow-subtle">
               Smart Attendance & Payroll. Simplified.
             </p>
           </div>
        </div>
        
        <CardContent className="flex flex-col items-center space-y-8 p-6 md:p-10">
          <p className="text-lg text-foreground/90 max-w-xl leading-relaxed">
            Streamline your workforce management with BizAttend. Effortless RFID clock-ins, automated payroll, and intelligent AI-powered anomaly detection. Free up your time to focus on what matters most – growing your business.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-2xl">
            <FeatureItem icon={Users} title="RFID Attendance" description="Seamless clock-in/out for employees using RFID/NFC tags." />
            <FeatureItem icon={DollarSign} title="Automated Payroll" description="Accurate payroll calculations based on attendance data, including overtime." />
            <FeatureItem icon={AlertTriangleIcon} title="AI Anomaly Detection" description="Identify and flag unusual attendance patterns for review." />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center pt-4">
            <Button asChild size="lg" className="group w-full sm:w-auto text-base px-8 py-6" variant="default">
              <Link href="/dashboard">
                Go to Dashboard
                <LogIn className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
             <Button asChild size="lg" className="group w-full sm:w-auto text-base px-8 py-6" variant="outline">
              <Link href="/login">
                Manager Login
              </Link>
            </Button>
          </div>
          
        </CardContent>
      </Card>
    </div>
  );
}

interface FeatureItemProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

function FeatureItem({ icon: Icon, title, description }: FeatureItemProps) {
  return (
    <div className="flex flex-col items-center p-4 bg-background/60 rounded-lg border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300">
      <Icon className="h-10 w-10 text-accent mb-3" />
      <h3 className="text-md font-semibold text-primary mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground text-center">{description}</p>
    </div>
  );
}

const styles = `
  .shadow-strong {
    text-shadow: 1px 1px 3px rgba(0,0,0,0.6);
  }
  .shadow-subtle {
    text-shadow: 1px 1px 2px rgba(0,0,0,0.4);
  }
`;
// Inject styles - useful for text-shadow which isn't standard in Tailwind
// In a real app, this might go into a <style jsx> tag or globals.css if more widely used.
if (typeof window !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}
