"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { useJob } from "@/hooks/useJobs"
import { KanbanBoard } from "@/components/pipeline/KanbanBoard"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"

export default function PipelinePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { data: job } = useJob(params.id)

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col h-full overflow-hidden">
      <PageHeader 
        title={job?.title || "Pipeline"} 
        subtitle={job ? `Jobs / ${job.title} / Pipeline` : "Jobs / Pipeline"}
      >
        <Button variant="outline" onClick={() => router.push('/jobs')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to jobs
        </Button>
      </PageHeader>

      <div className="flex-1 overflow-hidden">
        <KanbanBoard jobId={params.id} />
      </div>
    </div>
  )
}
