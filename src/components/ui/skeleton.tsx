import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
          "animate-pulse rounded-md bg-muted/70", // Increase opacity slightly for better visibility
          // Shimmer animation for modern loading effect
          "relative overflow-hidden",
          "after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer after:bg-gradient-to-r after:from-transparent after:via-muted/40 after:to-transparent", 
          className
      )}
      {...props}
    />
  )
}

export { Skeleton }
