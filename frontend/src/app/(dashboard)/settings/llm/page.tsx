"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, Save, FlaskConical, CheckCircle2, XCircle } from "lucide-react"
import { llmApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

const PROVIDER_MODELS: Record<string, string[]> = {
  mock: ["mock-model"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  gemini: ["gemini-1.5-flash", "gemini-1.5-pro"],
  deepseek: ["deepseek-chat", "deepseek-coder"],
}

export default function LLMSettingsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['llm-config'], queryFn: llmApi.getConfig })

  const [provider, setProvider] = React.useState<'mock' | 'openai' | 'gemini' | 'deepseek'>('mock')
  const [modelName, setModelName] = React.useState('mock-model')
  const [apiKey, setApiKey] = React.useState('')
  const [temperature, setTemperature] = React.useState(0.7)
  const [maxTokens, setMaxTokens] = React.useState(1000)
  const [test, setTest] = React.useState<any>(null)

  React.useEffect(() => {
    if (data) {
      setProvider(data.provider as any)
      setModelName(data.model_name)
      setTemperature(data.temperature)
      setMaxTokens(data.max_tokens)
      setApiKey('')
    }
  }, [data])

  const save = useMutation({
    mutationFn: () => llmApi.upsertConfig({
      provider, model_name: modelName, api_key: apiKey || undefined,
      temperature, max_tokens: maxTokens, is_active: true,
    } as any),
    onSuccess: () => {
      toast.success('LLM config saved')
      qc.invalidateQueries({ queryKey: ['llm-config'] })
      setApiKey('')
    },
  })

  const testMut = useMutation({
    mutationFn: () => llmApi.test({ provider, model_name: modelName, api_key: apiKey, temperature, max_tokens: 200 }),
    onSuccess: (r) => setTest(r),
    onError: (e: any) => setTest({ success: false, error: e?.response?.data?.error || e.message, latency_ms: 0 }),
  })

  if (isLoading) return <div className="p-6 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-brand-600" /></div>

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900">LLM Settings</h1>
      <p className="text-sm text-slate-500 mt-1">Configure the AI scoring backend for your tenant.</p>

      <div className="bg-white border border-surface-200 rounded-xl p-6 mt-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-700">Provider</label>
            <select value={provider} onChange={(e) => { setProvider(e.target.value as any); setModelName(PROVIDER_MODELS[e.target.value][0]) }} className="w-full h-9 px-3 mt-1 rounded-md border border-surface-200 text-sm bg-white">
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
            <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={data?.api_key === '****' ? 'Stored — leave blank to keep' : 'Paste API key'} />
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
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}Save
          </Button>
          <Button variant="outline" onClick={() => testMut.mutate()} disabled={testMut.isPending}>
            {testMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FlaskConical className="w-4 h-4 mr-2" />}Test
          </Button>
        </div>

        {test && (
          <div className={`mt-2 rounded-lg p-3 text-sm border ${test.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 font-medium">
              {test.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
              {test.success ? `OK (${test.latency_ms} ms)` : `Failed (${test.latency_ms} ms)`}
            </div>
            <pre className="mt-2 text-xs text-slate-700 whitespace-pre-wrap">{test.success ? test.response : test.error}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
