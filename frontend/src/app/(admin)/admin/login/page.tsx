"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2, ShieldCheck } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { adminAuth, adminApi } from "@/src/lib/admin-api"
import { toast } from "sonner"

export default function AdminLoginPage() {
  const router = useRouter()
  const [key, setKey] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    adminAuth.setKey(key)
    try {
      await adminApi.systemHealth()
      toast.success("Welcome, Super Admin")
      router.replace('/admin')
    } catch (err: any) {
      adminAuth.clearKey()
      setError("Invalid admin key")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900">
      <div className="w-full max-w-sm bg-slate-800 border border-slate-700 rounded-xl p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center mb-3">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-white">RecruitAI Admin</h1>
          <p className="text-xs text-slate-400 mt-1">Enter the admin secret to continue</p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700/50 text-red-300 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-300 mb-1 block">Admin Key</label>
            <Input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white"
              placeholder="••••••••••••"
              required
            />
          </div>
          <Button type="submit" disabled={loading || !key} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign in"}
          </Button>
          <p className="text-[11px] text-slate-500 text-center">Default dev key: <code className="text-slate-400">admin-secret-key</code></p>
        </form>
      </div>
    </div>
  )
}
