import { cn } from "@/lib/utils"

export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-surface-200 animate-pulse rounded", className)} />
  )
}
