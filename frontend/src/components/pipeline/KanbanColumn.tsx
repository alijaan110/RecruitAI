"use client"

import * as React from "react"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Application, AppStage } from "@/src/types/application"
import { CandidateCard } from "./CandidateCard"
import { cn } from "@/src/lib/utils"

interface KanbanColumnProps {
  stage: AppStage;
  apps: Application[];
}

export function KanbanColumn({ stage, apps }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
    data: {
      type: "Column",
      stage,
    }
  })

  // We map the IDs for SortableContext
  const appIds = React.useMemo(() => apps.map(x => x.id), [apps])

  return (
    <div 
      className={cn(
        "w-60 flex-shrink-0 rounded-xl p-2 flex flex-col transition-colors",
        isOver ? "bg-brand-50 origin-top ring-2 ring-brand-300" : "bg-surface-100"
      )}
      ref={setNodeRef}
    >
      <div className="flex items-center justify-between px-1 py-1.5 mb-2 flex-shrink-0">
        <div className="flex flex-row items-center gap-2">
           <span className="w-2 h-2 rounded-full" style={{ backgroundColor: `var(--stage-${stage})` }} />
           <span className="text-sm font-medium text-slate-700 capitalize">{stage}</span>
        </div>
        <span className="bg-surface-200 text-slate-500 text-xs px-2 rounded-full">
          {apps.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-220px)] space-y-2 p-1">
        <SortableContext items={appIds} strategy={verticalListSortingStrategy}>
          {apps.map(app => (
            <CandidateCard key={app.id} app={app} />
          ))}
        </SortableContext>
        {apps.length === 0 && (
          <div className="h-20 border-2 border-dashed border-surface-200 rounded-lg flex items-center justify-center text-xs text-slate-400">
            Drop here
          </div>
        )}
      </div>
    </div>
  )
}
