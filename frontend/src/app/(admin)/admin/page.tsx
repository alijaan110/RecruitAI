"use client"

import * as React from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Loader2, Building2, Users, Briefcase, FileText, TrendingUp, Database } from "lucide-react"
import { adminApi } from "@/src/lib/admin-api"
import { Button } from "@/src/components/ui/button"
import { toast } from "sonner"

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="bg-white border border-surface-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-500 font-medium">{label}</span>
        <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <div className="text-xl font-semibold text-slate-900">{value}</div>
    </div>
  )
}

export default function AdminOverviewPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminApi.stats,
  })

  const seedMutation = useMutation({
    mutationFn: adminApi.seedMockData,
    onSuccess: (res) => {
      toast.success("Mock data seeded", {
        description: `${res.tenants} tenants, ${res.users} users, ${res.jobs} jobs, ${res.candidates} candidates, ${res.applications} applications.`
      })
      refetch()
    },
    onError: (err: any) => {
      toast.error("Seed failed", { description: err?.response?.data?.error || err.message })
    }
  })

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-brand-600" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Platform Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">Aggregate stats across all tenants</p>
        </div>
        <Button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending} variant="outline">
          {seedMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Database className="w-4 h-4 mr-2" />}
          Seed Mock Data
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Tenants" value={data?.total_tenants ?? 0} icon={Building2} color="bg-blue-500" />
        <StatCard label="Active Tenants" value={data?.active_tenants ?? 0} icon={Building2} color="bg-emerald-500" />
        <StatCard label="Total Users" value={data?.total_users ?? 0} icon={Users} color="bg-violet-500" />
        <StatCard label="Total Jobs" value={data?.total_jobs ?? 0} icon={Briefcase} color="bg-amber-500" />
        <StatCard label="Total Candidates" value={data?.total_candidates ?? 0} icon={Users} color="bg-cyan-500" />
        <StatCard label="Total Applications" value={data?.total_applications ?? 0} icon={FileText} color="bg-pink-500" />
        <StatCard label="Apps last 7 days" value={data?.apps_last_7d ?? 0} icon={TrendingUp} color="bg-indigo-500" />
        <StatCard label="Apps last 30 days" value={data?.apps_last_30d ?? 0} icon={TrendingUp} color="bg-rose-500" />
      </div>

      <div className="bg-white border border-surface-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Plan Breakdown</h2>
        <div className="grid grid-cols-3 gap-3">
          {(['free', 'pro', 'enterprise'] as const).map((plan) => (
            <div key={plan} className="border border-surface-200 rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">{plan}</div>
              <div className="text-lg font-semibold text-slate-900 mt-0.5">{data?.plan_breakdown?.[plan] ?? 0}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
