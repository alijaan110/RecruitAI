"use client"

import * as React from "react"
import { JobStatus } from "@/src/types/job"

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const styles: Record<JobStatus, string> = {
    draft: "bg-slate-100 text-slate-600",
    published: "bg-brand-100 text-brand-700",
    closed: "bg-red-50 text-red-600",
    archived: "bg-surface-200 text-slate-400"
  }

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${styles[status]}`}>
      {status}
    </span>
  )
}
