"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { authApi } from "@/src/lib/api"
import { auth } from "@/src/lib/auth"
import { toast } from "sonner"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = React.useState(false)
  const [apiError, setApiError] = React.useState<string | null>(null)
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setApiError(null)
    try {
      const response = await authApi.login(data.email, data.password)
      auth.setSession(response.access_token, response.user, response.tenant)
      router.replace('/dashboard')
    } catch (err: any) {
      setApiError(err.response?.data?.message || "Invalid email or password")
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-8">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center shadow-md mb-4 border border-slate-800 relative overflow-hidden">
            <div className="absolute inset-0 bg-brand-500/20 blur-xl"></div>
            <span className="text-white font-bold text-3xl leading-none relative z-10">R</span>
            <span className="text-brand-500 font-bold text-3xl leading-none relative z-10">.</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">RecruitAI</h1>
          <p className="text-[10px] text-brand-600 font-bold tracking-widest uppercase mt-1">Automated Hiring</p>
          <p className="text-sm text-slate-500 mt-6">Sign in to your account</p>
          <div className="mt-4 p-3 bg-blue-50 text-blue-700 text-xs rounded border border-blue-200 w-full text-left">
            <p className="font-semibold mb-1">Seeded demo credentials:</p>
            <p>Email: admin@techcorp.com</p>
            <p>Password: password123</p>
            <p className="mt-1 text-blue-500">Run admin → Seed Mock Data first.</p>
          </div>
        </div>

        {apiError && (
          <div className="bg-red-50 border border-red-200 text-sm text-red-700 rounded-lg p-3 mb-4">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Email</label>
            <Input 
              {...register("email")}
              placeholder="you@company.com" 
              className={errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
          </div>
          
          <div className="space-y-1 relative">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700">Password</label>
              <Link href="#" className="text-xs text-brand-600 hover:text-brand-700">Forgot password?</Link>
            </div>
            <div className="relative">
              <Input 
                {...register("password")}
                type={showPassword ? "text" : "password"}
                className={errors.password ? "border-red-500 focus-visible:ring-red-500 pr-10" : "pr-10"}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full h-10 mt-2">
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign in"}
          </Button>
        </form>
      </div>
      
      <div className="text-center mt-6">
        <p className="text-sm text-slate-500">
          Don't have an account? <Link href="/register" className="text-brand-600 hover:text-brand-700 font-medium">Create one</Link>
        </p>
      </div>
    </div>
  )
}
