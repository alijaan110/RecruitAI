import { cn } from "@/lib/utils"

interface ScoreBadgeProps {
  score?: number | null;
  size?: 'sm' | 'md' | 'lg';
}

export function ScoreBadge({ score, size = 'sm' }: ScoreBadgeProps) {
  if (score === null || score === undefined) {
    return <span className={cn("text-slate-300 font-medium", size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-sm' : 'text-xs')}>—</span>
  }

  let colorClass = "text-brand-600"
  if (score <= 40) colorClass = "text-red-500"
  else if (score <= 65) colorClass = "text-amber-500"

  const sizeClass = size === 'lg' ? 'text-2xl font-bold' : size === 'md' ? 'text-sm font-semibold' : 'text-xs font-semibold'

  return <span className={cn(colorClass, sizeClass)}>{score}</span>
}
