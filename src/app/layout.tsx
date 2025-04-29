import type { Metadata } from "next";
import { Poppins } from "next/font/google"; // Correct import
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster"; // Import Toaster

// Configure Poppins font
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"], // Include necessary weights
  variable: "--font-sans", // Define CSS variable for the font
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
      {/* Apply the font variable directly to the html or body tag */}
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          poppins.variable // Apply the font variable class name
        )}
      >
        {children}
        <Toaster /> {/* Add Toaster component here */}
      </body>
    </html>
  );
}
