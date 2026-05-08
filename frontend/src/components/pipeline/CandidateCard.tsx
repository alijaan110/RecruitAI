"use client"

import * as React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useRouter } from "next/navigation"
import { Star } from "lucide-react"
import { Application } from "@/types/application"
import { formatTimeAgo, initials, cn } from "@/lib/utils"
import { ScoreBadge } from "../candidates/ScoreBadge"
import { useStarApplication } from "@/hooks/useApplications"

interface CandidateCardProps {
  app: Application;
  isDraggingOverlay?: boolean;
}

export function CandidateCard({ app, isDraggingOverlay }: CandidateCardProps) {
  const router = useRouter()
  const { mutate: starApp } = useStarApplication()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: app.id,
    data: {
      type: "Card",
      app,
    }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Prevent routing when dragging
  const handleClick = (e: React.MouseEvent) => {
    // If it's the toggle star button, ignore
    if ((e.target as HTMLElement).closest('button.star-btn')) return;
    if (!isDragging) {
      router.push(`/candidates/${app.candidate.id}`)
    }
  }

  const handleStar = (e: React.MouseEvent) => {
    e.stopPropagation()
    starApp({ id: app.id, isStarred: !app.is_starred })
  }

  if (isDragging && !isDraggingOverlay) {
    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        className="bg-white border-2 border-brand-300 border-dashed rounded-lg p-3 opacity-30 h-[100px]"
      />
    )
  }

  return (
    <div
      ref={isDraggingOverlay ? undefined : setNodeRef}
      style={isDraggingOverlay ? undefined : style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={cn(
        "bg-white border border-surface-200 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-brand-200 transition-all duration-150 relative",
        isDraggingOverlay && "opacity-90 shadow-xl scale-105 rotate-2"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-7 h-7 bg-brand-50 text-brand-700 text-xs rounded-full flex items-center justify-center flex-shrink-0 shadow-sm uppercase font-semibold">
            {initials(app.candidate.full_name)}
          </div>
          <span className="text-sm font-medium text-slate-900 truncate">
            {app.candidate.full_name}
          </span>
        </div>
        <button 
          onClick={handleStar}
          className="star-btn cursor-pointer p-1 rounded hover:bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <Star className={cn("w-4 h-4", app.is_starred ? "fill-brand-400 text-brand-400" : "text-slate-300")} />
        </button>
      </div>

      <div className="flex items-center gap-1 mb-2">
        <ScoreBadge score={app.overall_score} size="sm" />
        <span className="text-xs text-slate-400">match</span>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{formatTimeAgo(app.applied_at)}</span>
        <span className="bg-surface-50 px-1.5 py-0.5 rounded capitalize truncate max-w-[80px]">
          {app.candidate.source}
        </span>
      </div>
    </div>
  )
}
