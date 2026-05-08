"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { adminApi } from "@/lib/admin-api"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"

export default function AdminUsersPage() {
  const [search, setSearch] = React.useState("")
  const [role, setRole] = React.useState("")
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, role],
    queryFn: () => adminApi.users({ search: search || undefined, role: role || undefined, page: 1, limit: 50 }),
  })

  const deactivateMut = useMutation({
    mutationFn: (id: string) => adminApi.deactivateUser(id),
    onSuccess: () => {
      toast.success("User deactivated")
      qc.invalidateQueries({ queryKey: ['admin-users'] })
    }
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Users</h1>
        <p className="text-sm text-slate-500 mt-0.5">All users across tenants</p>
      </div>

      <div className="flex gap-2">
        <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="h-9 px-3 rounded-md border border-surface-200 text-sm bg-white">
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="recruiter">Recruiter</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>

      <div className="bg-white border border-surface-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-brand-600" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-surface-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-slate-500">Name</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-slate-500">Email</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-slate-500">Tenant</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-slate-500">Role</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-slate-500">Status</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-slate-500">Joined</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {data?.items.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 text-slate-900 font-medium">{u.full_name}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3 text-slate-700">{u.tenant_name}</td>
                  <td className="px-4 py-3 capitalize">{u.role}</td>
                  <td className="px-4 py-3">{u.is_active ? <span className="text-emerald-600">Active</span> : <span className="text-slate-400">Disabled</span>}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {u.is_active && (
                      <Button variant="outline" size="sm" onClick={() => deactivateMut.mutate(u.id)} disabled={deactivateMut.isPending}>Deactivate</Button>
                    )}
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
