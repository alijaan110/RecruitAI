"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useJob, useUpdateJob } from "@/hooks/useJobs"
import { PageHeader } from "@/components/layout/PageHeader"
import { JobForm } from "@/components/jobs/JobForm"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"

export default function EditJobPage({ params }: { params: { id: string } }) {
  const { data: job, isLoading } = useJob(params.id)
  const updateMutation = useUpdateJob()
  const router = useRouter()

  const handleSubmit = async (data: any, publish: boolean) => {
    try {
      await updateMutation.mutateAsync({ id: params.id, data })
      router.push('/jobs')
    } catch (e) {
      console.error(e)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <LoadingSkeleton className="h-20 w-1/3" />
        <LoadingSkeleton className="h-96" />
      </div>
    )
  }

  if (!job) {
    return <div className="p-6">Job not found</div>
  }

  const initialData = {
    ...job,
    closes_at: job.closes_at ? job.closes_at.split('T')[0] : "", // ensure it fits date input if it's a date-time
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader title="Edit Job" subtitle={job.title} />
      <div className="bg-white rounded-xl border border-surface-200 p-6">
        <JobForm initialData={initialData} onSubmit={handleSubmit} isSubmitting={updateMutation.isPending} />
      </div>
    </div>
  )
}
