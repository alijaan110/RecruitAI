import { cn } from "@/lib/utils"
import { AppStage } from "@/types/application"

interface StageBadgeProps {
  stage: AppStage;
  size?: 'sm' | 'md';
}

const STAGE_STYLES: Record<string, string> = {
  received: 'bg-slate-50 text-slate-600',
  screening: 'bg-amber-50 text-amber-700',
  interview: 'bg-blue-50 text-blue-700',
  offer: 'bg-green-50 text-green-700',
  hired: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700'
};

export function StageBadge({ stage, size = 'sm' }: StageBadgeProps) {
  const sizeClass = size === 'md' ? 'text-sm px-2.5 py-1' : 'text-xs px-2 py-0.5'
  const styleClass = STAGE_STYLES[stage] || 'bg-slate-50 text-slate-600'
  
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full font-medium capitalize", sizeClass, styleClass)}>
      <span 
        className="w-1.5 h-1.5 rounded-full" 
        style={{ backgroundColor: `var(--stage-${stage})` }} 
      />
      {stage}
    </span>
  )
}
