"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useJob } from "@/hooks/useJobs"
import { PageHeader } from "@/components/layout/PageHeader"
import { JobStatusBadge } from "@/components/jobs/JobStatusBadge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Pencil, Users, ExternalLink } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const { data: job, isLoading } = useJob(params.id)
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <LoadingSkeleton className="h-20 w-1/3" />
        <LoadingSkeleton className="h-64" />
      </div>
    )
  }

  if (!job) {
    return <div className="p-6">Job not found</div>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader title={job.title} subtitle={`Created on ${formatDate(job.created_at)}`}>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.push('/jobs')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button variant="outline" onClick={() => router.push(`/jobs/${job.id}/edit`)}>
            <Pencil className="w-4 h-4 mr-2" /> Edit
          </Button>
          <Button onClick={() => router.push(`/jobs/${job.id}/pipeline`)}>
            <Users className="w-4 h-4 mr-2" /> Pipeline
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-surface-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Description</h3>
            <div className="prose prose-sm text-slate-600 whitespace-pre-wrap">
              {job.description}
            </div>
          </div>

          <div className="bg-white border border-surface-200 rounded-xl p-6 shadow-sm">
             <h3 className="text-sm font-semibold text-slate-900 mb-4">Requirements</h3>
             {job.requirements && job.requirements.length > 0 ? (
               <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
                 {job.requirements.map((req, i) => <li key={i}>{req}</li>)}
               </ul>
             ) : (
               <p className="text-sm text-slate-500">No requirements specified.</p>
             )}
          </div>

          {job.nice_to_have && job.nice_to_have.length > 0 && (
            <div className="bg-white border border-surface-200 rounded-xl p-6 shadow-sm">
               <h3 className="text-sm font-semibold text-slate-900 mb-4">Nice to Have</h3>
               <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
                 {job.nice_to_have.map((nth, i) => <li key={i}>{nth}</li>)}
               </ul>
            </div>
          )}
        </div>

        <div className="space-y-6 lg:col-span-1">
          <div className="bg-white border border-surface-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Job Details</h3>
            
            <div className="space-y-4">
              <div>
                <dt className="text-xs font-medium text-slate-500 uppercase">Status</dt>
                <dd className="mt-1"><JobStatusBadge status={job.status} /></dd>
              </div>
              
              <div>
                <dt className="text-xs font-medium text-slate-500 uppercase">Employment Type</dt>
                <dd className="mt-1 text-sm text-slate-900 capitalize">{job.employment_type?.replace('_', ' ')}</dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-slate-500 uppercase">Location</dt>
                <dd className="mt-1 text-sm text-slate-900">{job.location || 'Not specified'}</dd>
              </div>
              
              <div>
                <dt className="text-xs font-medium text-slate-500 uppercase">Department</dt>
                <dd className="mt-1 text-sm text-slate-900">{job.department || 'Not specified'}</dd>
              </div>

              {job.salary_min !== undefined && job.salary_max !== undefined && (
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase">Salary Range</dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {job.salary_min.toLocaleString()} - {job.salary_max.toLocaleString()} {job.salary_currency}
                  </dd>
                </div>
              )}

              {job.closes_at && (
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase">Closes At</dt>
                  <dd className="mt-1 text-sm text-slate-900">{formatDate(job.closes_at)}</dd>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-surface-200 rounded-xl p-6 shadow-sm">
             <h3 className="text-sm font-semibold text-slate-900 mb-4">Sharing</h3>
             <a
               href={`/apply/${job.public_slug}`}
               target="_blank"
               rel="noopener noreferrer"
               className="flex items-center justify-between p-3 rounded-lg border border-brand-200 bg-brand-50 hover:bg-brand-100 transition-colors group"
             >
               <span className="text-sm font-medium text-brand-700">View Public Application</span>
               <ExternalLink className="w-4 h-4 text-brand-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
             </a>
          </div>

          {job.keywords && job.keywords.length > 0 && (
            <div className="bg-white border border-surface-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Scoring Keywords</h3>
              <div className="flex flex-wrap gap-2">
                {job.keywords.map((k, i) => (
                  <span key={i} className="bg-surface-100 text-slate-700 text-xs px-2.5 py-1 rounded-md">
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
