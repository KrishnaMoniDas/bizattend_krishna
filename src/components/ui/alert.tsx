import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
   // Base glassmorphism styles
   "bg-background/70 backdrop-blur-md border-white/10", // Adjust alpha and blur as needed
  {
    variants: {
      variant: {
        default: "text-foreground border-border/50", // Keep default text, adjust border if needed
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive bg-destructive/10", // Lighter red background for destructive
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    // Apply backdrop-filter conditionally for browser support
    style={{
        // Fallback for browsers not supporting backdrop-filter
        backgroundColor: variant === 'destructive' ? 'hsla(var(--destructive) / 0.1)' : 'hsla(var(--background) / 0.7)',
        // Apply backdrop-filter if supported
        // @ts-ignore - Suppress TS error for vendor prefix
        ...(typeof window !== 'undefined' && ('backdropFilter' in document.documentElement.style || 'WebkitBackdropFilter' in document.documentElement.style) && {
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
         }),
    }}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
