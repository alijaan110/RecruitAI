"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { adminApi } from "@/lib/admin-api"
import { formatTimeAgo } from "@/lib/utils"

export default function AdminEmailsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-emails'],
    queryFn: () => adminApi.emailLogs({ page: 1, limit: 100 }),
  })

  const statusBadge = (s: string) => {
    if (s === 'sent') return 'bg-emerald-50 text-emerald-700'
    if (s === 'failed') return 'bg-red-50 text-red-700'
    return 'bg-slate-100 text-slate-600'
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Email Logs</h1>
        <p className="text-sm text-slate-500 mt-0.5">All transactional emails sent (or skipped in dev)</p>
      </div>

      <div className="bg-white border border-surface-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-brand-600" /></div>
        ) : (data?.items?.length ?? 0) === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">No emails logged yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-surface-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-slate-500">When</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-slate-500">To</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-slate-500">Template</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-slate-500">Subject</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {data?.items.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 text-slate-500">{formatTimeAgo(e.created_at)}</td>
                  <td className="px-4 py-3 text-slate-700">{e.recipient_email}</td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs">{e.template_name}</td>
                  <td className="px-4 py-3 text-slate-700 truncate max-w-md">{e.subject}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(e.status)}`}>{e.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
