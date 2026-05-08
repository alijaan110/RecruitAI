"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { adminApi } from "@/lib/admin-api"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"

export default function AdminTenantDetail() {
  const { id } = useParams() as { id: string }
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-tenant', id],
    queryFn: () => adminApi.tenantDetail(id),
  })

  const planMut = useMutation({
    mutationFn: (plan: string) => adminApi.updatePlan(id, plan),
    onSuccess: () => {
      toast.success("Plan updated")
      qc.invalidateQueries({ queryKey: ['admin-tenant', id] })
    },
  })

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-5 h-5 animate-spin text-brand-600" /></div>
  if (!data) return <div>Not found</div>

  const t = data.tenant

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{t.name}</h1>
          <p className="text-sm text-slate-500 mt-0.5">/{t.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Plan:</label>
          <select
            value={t.plan}
            onChange={(e) => planMut.mutate(e.target.value)}
            className="h-9 px-3 rounded-md border border-surface-200 text-sm bg-white"
            disabled={planMut.isPending}
          >
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-surface-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Users</div>
          <div className="text-xl font-semibold text-slate-900">{t.user_count}</div>
        </div>
        <div className="bg-white border border-surface-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Jobs</div>
          <div className="text-xl font-semibold text-slate-900">{t.job_count}</div>
        </div>
        <div className="bg-white border border-surface-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Applications</div>
          <div className="text-xl font-semibold text-slate-900">{t.application_count}</div>
        </div>
        <div className="bg-white border border-surface-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">CV Uploads</div>
          <div className="text-xl font-semibold text-slate-900">{t.cv_uploads_count}</div>
        </div>
      </div>

      <div className="bg-white border border-surface-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-200">
          <h2 className="text-sm font-semibold text-slate-900">Users ({data.users.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-slate-500">Name</th>
              <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-slate-500">Email</th>
              <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-slate-500">Role</th>
              <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-slate-500">Status</th>
              <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-slate-500">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {data.users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2 text-slate-900">{u.full_name}</td>
                <td className="px-4 py-2 text-slate-600">{u.email}</td>
                <td className="px-4 py-2 capitalize">{u.role}</td>
                <td className="px-4 py-2">{u.is_active ? <span className="text-emerald-600">Active</span> : <span className="text-slate-400">Disabled</span>}</td>
                <td className="px-4 py-2 text-slate-500">{formatDate(u.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
