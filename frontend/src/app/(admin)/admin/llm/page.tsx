"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, CheckCircle2, XCircle, Save, FlaskConical } from "lucide-react"
import { adminApi } from "@/lib/admin-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

const PROVIDER_MODELS: Record<string, string[]> = {
  mock: ["mock-model"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  gemini: ["gemini-1.5-flash", "gemini-1.5-pro"],
  deepseek: ["deepseek-chat", "deepseek-coder"],
}

export default function AdminLLMPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['admin-llm'], queryFn: adminApi.llmConfig })

  const [provider, setProvider] = React.useState("mock")
  const [modelName, setModelName] = React.useState("mock-model")
  const [apiKey, setApiKey] = React.useState("")
  const [temperature, setTemperature] = React.useState(0.7)
  const [maxTokens, setMaxTokens] = React.useState(1000)
  const [testResult, setTestResult] = React.useState<any>(null)

  React.useEffect(() => {
    if (data?.global) {
      setProvider(data.global.provider)
      setModelName(data.global.model_name)
      setTemperature(data.global.temperature)
      setMaxTokens(data.global.max_tokens)
      setApiKey("")
    }
  }, [data?.global])

  const saveMut = useMutation({
    mutationFn: () => adminApi.upsertGlobalLLM({
      provider, model_name: modelName, api_key: apiKey || undefined,
      temperature, max_tokens: maxTokens, is_active: true,
    } as any),
    onSuccess: () => {
      toast.success("Global LLM config saved")
      qc.invalidateQueries({ queryKey: ['admin-llm'] })
      setApiKey("")
    },
    onError: (e: any) => toast.error("Save failed", { description: e?.response?.data?.error || e.message }),
  })

  const testMut = useMutation({
    mutationFn: () => adminApi.testLLM({ provider, model_name: modelName, api_key: apiKey, temperature, max_tokens: 200 }),
    onSuccess: (res) => setTestResult(res),
    onError: (e: any) => setTestResult({ success: false, error: e?.response?.data?.error || e.message, latency_ms: 0 }),
  })

  const removeOverride = useMutation({
    mutationFn: (tenantId: string) => adminApi.deleteTenantLLM(tenantId),
    onSuccess: () => {
      toast.success("Override removed")
      qc.invalidateQueries({ queryKey: ['admin-llm'] })
    },
  })

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-5 h-5 animate-spin text-brand-600" /></div>

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">LLM Configuration</h1>
        <p className="text-sm text-slate-500 mt-0.5">Global default and per-tenant overrides</p>
      </div>

      <div className="bg-white border border-surface-200 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Global default</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-700">Provider</label>
            <select value={provider} onChange={(e) => { setProvider(e.target.value); setModelName(PROVIDER_MODELS[e.target.value]?.[0] || "") }} className="w-full h-9 px-3 mt-1 rounded-md border border-surface-200 text-sm bg-white">
              <option value="mock">Mock (no key)</option>
              <option value="openai">OpenAI</option>
              <option value="gemini">Google Gemini</option>
              <option value="deepseek">DeepSeek</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700">Model</label>
            <select value={modelName} onChange={(e) => setModelName(e.target.value)} className="w-full h-9 px-3 mt-1 rounded-md border border-surface-200 text-sm bg-white">
              {(PROVIDER_MODELS[provider] || []).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-medium text-slate-700">API Key</label>
            <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={data?.global?.api_key === '****' ? 'Stored — leave blank to keep' : 'Paste API key'} />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700">Temperature: {temperature}</label>
            <input type="range" min="0" max="1" step="0.1" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} className="w-full mt-2" />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700">Max tokens</label>
            <Input type="number" value={maxTokens} onChange={(e) => setMaxTokens(parseInt(e.target.value || '0'))} min={100} max={4000} />
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-surface-100">
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Global Config
          </Button>
          <Button variant="outline" onClick={() => testMut.mutate()} disabled={testMut.isPending}>
            {testMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FlaskConical className="w-4 h-4 mr-2" />}
            Test Connection
          </Button>
        </div>

        {testResult && (
          <div className={`mt-2 rounded-lg p-3 text-sm border ${testResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 font-medium">
              {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
              {testResult.success ? `OK (${testResult.latency_ms} ms)` : `Failed (${testResult.latency_ms} ms)`}
            </div>
            <pre className="mt-2 text-xs text-slate-700 whitespace-pre-wrap">{testResult.success ? testResult.response : testResult.error}</pre>
          </div>
        )}
      </div>

      <div className="bg-white border border-surface-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-200">
          <h2 className="text-sm font-semibold text-slate-900">Tenant overrides</h2>
        </div>
        {data && data.overrides.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No tenant overrides — all tenants use the global config.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-slate-500">Tenant</th>
                <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-slate-500">Provider</th>
                <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-slate-500">Model</th>
                <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-slate-500">Active</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {data?.overrides.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-2 text-slate-900">{o.tenant_name || o.tenant_id}</td>
                  <td className="px-4 py-2 capitalize">{o.provider}</td>
                  <td className="px-4 py-2 text-slate-600">{o.model_name}</td>
                  <td className="px-4 py-2">{o.is_active ? <span className="text-emerald-600">Yes</span> : <span className="text-slate-400">No</span>}</td>
                  <td className="px-4 py-2 text-right">
                    <Button variant="outline" size="sm" onClick={() => removeOverride.mutate(o.tenant_id!)} disabled={removeOverride.isPending}>Remove</Button>
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
