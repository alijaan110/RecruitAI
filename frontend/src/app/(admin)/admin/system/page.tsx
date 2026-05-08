"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { CheckCircle2, XCircle, Loader2, Database, Cpu, Brain, HardDrive, Clock, Cloud } from "lucide-react"
import { adminApi } from "@/src/lib/admin-api"

function HealthCard({ icon: Icon, title, ok, children }: { icon: any; title: string; ok: boolean; children?: React.ReactNode }) {
  return (
    <div className="bg-white border border-surface-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">{title}</span>
        </div>
        {ok ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
      </div>
      <div className="text-xs text-slate-500 space-y-0.5">{children}</div>
    </div>
  )
}

function formatUptime(s: number) {
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${s % 60}s`
}

export default function AdminSystemPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-system'],
    queryFn: adminApi.systemHealth,
    refetchInterval: 30000,
  })

  if (isLoading || !data) return <div className="flex items-center justify-center h-64"><Loader2 className="w-5 h-5 animate-spin text-brand-600" /></div>

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">System Health</h1>
        <p className="text-sm text-slate-500 mt-0.5">Auto-refreshes every 30 seconds. Status: <span className={data.status === 'ok' ? 'text-emerald-600' : 'text-amber-600'}>{data.status}</span></p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <HealthCard icon={Database} title="Database" ok={data.db.ok}>
          <div>Type: {data.db.type}</div>
        </HealthCard>
        <HealthCard icon={Cpu} title="LLM Provider" ok={true}>
          <div>Provider: {data.llm.provider}</div>
          <div>Configured: {data.llm.configured ? 'Yes' : 'Default'}</div>
        </HealthCard>
        <HealthCard icon={Brain} title="spaCy NLP" ok={data.spacy.ok}>
          <div>Model: {data.spacy.model}</div>
          <div>{data.spacy.ok ? 'Loaded' : 'Not available — using basic extraction'}</div>
        </HealthCard>
        <HealthCard icon={HardDrive} title="Storage" ok={data.storage.ok}>
          <div>Mode: {data.storage.mode}</div>
          <div className="break-all">Path: {data.storage.path}</div>
        </HealthCard>
        <HealthCard icon={Clock} title="Uptime" ok={true}>
          <div>{formatUptime(data.uptime_seconds)}</div>
        </HealthCard>
        <HealthCard icon={Cloud} title="Environment" ok={true}>
          <div className="capitalize">{data.env}</div>
        </HealthCard>
      </div>
    </div>
  )
}
