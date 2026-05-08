"use client"

import * as React from "react"
import { Application } from "@/types/application"
import { KanbanColumn } from "./KanbanColumn"
import { usePipelineData, useKanbanMove } from "@/hooks/usePipeline"
import { AppStage } from "@/types/application"
import { LoadingSkeleton } from "../shared/LoadingSkeleton"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CandidateCard } from "./CandidateCard"

const STAGES: AppStage[] = ['received', 'screening', 'interview', 'offer', 'hired', 'rejected']

interface KanbanBoardProps {
  jobId: string;
}

export function KanbanBoard({ jobId }: KanbanBoardProps) {
  const { data, isLoading } = usePipelineData(jobId)
  const moveMutation = useKanbanMove(jobId)

  const [activeId, setActiveId] = React.useState<string | null>(null)
  
  // Create a flattened lookup for active card
  const getAppById = (id: string | null): Application | undefined => {
    if (!id || !data) return undefined;
    for (const stage of Object.values(data)) {
      const app = stage.find(a => a.id === id)
      if (app) return app;
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveId(active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeAppId = active.id as string
    const overId = over.id as string

    // find source stage and target stage
    if (!data) return;
    
    let sourceStage: AppStage | null = null
    let targetStage: AppStage | null = null

    // Check if overId is a stage name (column drop target)
    if (STAGES.includes(overId as AppStage)) {
      targetStage = overId as AppStage
    } else {
      // Find candidate's stage
      for (const st of STAGES) {
         if (data[st]?.some(a => a.id === overId)) {
           targetStage = st;
           break;
         }
      }
    }

    for (const st of STAGES) {
      if (data[st]?.some(a => a.id === activeAppId)) {
        sourceStage = st;
        break;
      }
    }

    if (sourceStage && targetStage && sourceStage !== targetStage) {
      moveMutation.mutate({ id: activeAppId, stage: targetStage })
    }
  }

  if (isLoading) {
    return (
      <div className="flex gap-4">
        {STAGES.map(s => <LoadingSkeleton key={s} className="w-60 h-[500px]" />)}
      </div>
    )
  }

  const activeApp = getAppById(activeId);

  return (
    <div className="h-full overflow-x-auto pb-4">
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 min-w-max h-full">
          {STAGES.map(stage => {
            const apps = data?.[stage] || []
            return (
              <KanbanColumn 
                key={stage} 
                stage={stage} 
                apps={apps} 
              />
            )
          })}
        </div>
        <DragOverlay>
          {activeApp ? <CandidateCard app={activeApp} isDraggingOverlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
