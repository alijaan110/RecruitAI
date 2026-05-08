"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { adminApi } from "@/src/lib/admin-api"
import { Input } from "@/src/components/ui/input"
import { formatDate } from "@/src/lib/utils"

export default function AdminTenantsPage() {
  const [search, setSearch] = React.useState("")
  const [plan, setPlan] = React.useState<string>("")

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tenants', search, plan],
    queryFn: () => adminApi.tenants({ search: search || undefined, plan: plan || undefined, page: 1, limit: 30 }),
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Tenants</h1>
        <p className="text-sm text-slate-500 mt-0.5">All companies on the platform</p>
      </div>

      <div className="flex gap-2">
        <Input placeholder="Search by name…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <select value={plan} onChange={(e) => setPlan(e.target.value)} className="h-9 px-3 rounded-md border border-surface-200 text-sm bg-white">
          <option value="">All plans</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      <div className="bg-white border border-surface-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-brand-600" /></div>
        ) : (data?.items?.length ?? 0) === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">No tenants found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-surface-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Users</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Jobs</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Apps</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">CV uploads</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {data?.items.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><Link href={`/admin/tenants/${t.id}`} className="text-brand-600 hover:underline font-medium">{t.name}</Link></td>
                  <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium capitalize">{t.plan}</span></td>
                  <td className="px-4 py-3 text-slate-700">{t.user_count}</td>
                  <td className="px-4 py-3 text-slate-700">{t.job_count}</td>
                  <td className="px-4 py-3 text-slate-700">{t.application_count}</td>
                  <td className="px-4 py-3 text-slate-700">{t.cv_uploads_count}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
