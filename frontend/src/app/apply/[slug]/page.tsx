import * as React from "react"
import { notFound } from "next/navigation"
import { ApplyForm } from "./ApplyForm"

async function getPublicJob(slug: string) {
  const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  try {
    const res = await fetch(`${apiUrl}/api/v1/jobs/public/${slug}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.data || data
  } catch {
    return null
  }
}

export default async function PublicApplicationPage({ params }: { params: { slug: string } }) {
  const job = await getPublicJob(params.slug)
  if (!job) notFound()

  let closingSoon = false
  if (job.closes_at) {
    const diffDays = (new Date(job.closes_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24)
    if (diffDays > 0 && diffDays <= 7) closingSoon = true
  }

  return (
    <div className="min-h-screen bg-surface-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white border border-surface-200 rounded-xl p-6 mb-6 shadow-sm">
          <div className="mb-4">
            <h1 className="text-xl font-semibold text-slate-900">{job.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-slate-500">
              {job.location && <span>{job.location} • </span>}
              <span className="bg-surface-100 text-slate-600 px-2 py-0.5 rounded capitalize text-xs">
                {job.employment_type?.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="prose-sm text-slate-600 mb-2">
            <p className="whitespace-pre-line">{job.description}</p>
          </div>

          {closingSoon && (
            <div className="mt-4 bg-amber-50 text-amber-700 text-xs font-medium px-3 py-2 rounded-lg border border-amber-200 inline-flex items-center">
              Closing soon! Applications close on {new Date(job.closes_at!).toLocaleDateString()}
            </div>
          )}
        </div>

        <ApplyForm job={job} />
      </div>
    </div>
  )
}
