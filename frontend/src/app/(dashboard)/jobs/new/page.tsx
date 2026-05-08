"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useCreateJob, usePublishJob } from "@/hooks/useJobs"
import { PageHeader } from "@/components/layout/PageHeader"
import { JobForm } from "@/components/jobs/JobForm"

export default function NewJobPage() {
  const createMutation = useCreateJob()
  const publishMutation = usePublishJob()
  const router = useRouter()

  const handleSubmit = async (data: any, publish: boolean) => {
    try {
      const job = await createMutation.mutateAsync(data)
      if (publish) {
        await publishMutation.mutateAsync(job.id)
      }
      router.push('/jobs')
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader title="New Job" subtitle="Create a new job posting" />
      <div className="bg-white rounded-xl border border-surface-200 p-6">
        <JobForm onSubmit={handleSubmit} isSubmitting={createMutation.isPending || publishMutation.isPending} />
      </div>
    </div>
  )
}
