import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
          "animate-pulse rounded-md bg-muted/60", // Increase opacity slightly for better visibility
          // Optional shimmer animation: keep if desired
          "relative overflow-hidden",
          "after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.5s_infinite] after:bg-gradient-to-r after:from-transparent after:via-muted/30 after:to-transparent", // Adjust shimmer opacity if needed
          className
      )}
      {...props}
    />
  )
}

// Ensure shimmer animation is defined (e.g., in globals.css or tailwind config)
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
