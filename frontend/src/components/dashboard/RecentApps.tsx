"use client"

import * as React from "react"
import Link from "next/link"
import { Users } from "lucide-react"
import { formatTimeAgo, initials } from "@/src/lib/utils"
import { StageBadge } from "../candidates/StageBadge"
import { EmptyState } from "../shared/EmptyState"
import type { AppStage } from "@/src/types/application"

interface RecentAppRow {
  id: string;
  candidate_name: string;
  job_title: string;
  stage: string;
  date: string;
}

export function RecentApps({ apps }: { apps: RecentAppRow[] | undefined }) {
  return (
    <div className="bg-white border border-surface-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-700">Recent Applications</h3>
        <Link href="/candidates" className="text-xs text-brand-600 hover:text-brand-700 font-medium">
          View all
        </Link>
      </div>

      {!apps || apps.length === 0 ? (
        <EmptyState icon={Users} title="No applications yet" />
      ) : (
        <div className="divide-y divide-surface-100">
          {apps.map(app => (
            <div key={app.id} className="py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 text-xs font-medium flex items-center justify-center uppercase flex-shrink-0">
                  {initials(app.candidate_name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{app.candidate_name}</p>
                  <p className="text-xs text-slate-400 truncate">{app.job_title}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <StageBadge stage={app.stage as AppStage} size="sm" />
                <span className="text-[10px] text-slate-400">{formatTimeAgo(app.date)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
