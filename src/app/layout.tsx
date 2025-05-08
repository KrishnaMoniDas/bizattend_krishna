import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import AuthProvider from "@/components/auth/AuthProvider";
import { AuthButton } from "@/components/auth/AuthButton";
import Link from "next/link";
import { Briefcase } from "lucide-react";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "BizAttend - Attendance & Payroll",
  description: "Plug-and-Play Digital Attendance & Payroll System for Small Businesses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased flex flex-col",
          poppins.variable
        )}
      >
        <AuthProvider>
          <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm shadow-sm">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
              <Link href="/" className="flex items-center gap-2">
                <Briefcase className="h-7 w-7 text-primary" />
                <span className="text-xl font-semibold text-foreground">BizAttend</span>
              </Link>
              <div className="flex items-center gap-4">
                <AuthButton />
              </div>
            </div>
          </header>
          <main className="container mx-auto flex-grow px-4 py-8 sm:px-6 lg:px-8 flex flex-col">
            {children}
          </main>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
