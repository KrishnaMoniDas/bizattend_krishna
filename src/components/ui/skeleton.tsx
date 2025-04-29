import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
          "animate-pulse rounded-md bg-muted/80", // Slightly more transparent muted color
          // Optional: Add a subtle shimmer animation
          // "relative overflow-hidden",
          // "after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.5s_infinite] after:bg-gradient-to-r after:from-transparent after:via-muted/40 after:to-transparent",
          className
      )}
      {...props}
    />
  )
}

// Optional: Define shimmer keyframes in globals.css or here if needed
/*
@layer utilities {
  @keyframes shimmer {
    100% {
      transform: translateX(100%);
    }
  }
}
*/


export { Skeleton }
