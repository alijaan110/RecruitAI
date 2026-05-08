"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { authApi } from "@/src/lib/api"
import { auth } from "@/src/lib/auth"

const registerSchema = z.object({
  company_name: z.string().min(2, "Company name must be at least 2 characters"),
  full_name: z.string().min(2, "Full name required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirm: z.string()
}).refine(d => d.password === d.confirm, { message: "Passwords don't match", path: ["confirm"] })

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const [apiError, setApiError] = React.useState<string | null>(null)
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterForm) => {
    setApiError(null)
    try {
      const response = await authApi.register(data.company_name, data.full_name, data.email, data.password)
      auth.setSession(response.access_token, response.user, response.tenant)
      router.replace('/dashboard')
    } catch (err: any) {
      setApiError(err.response?.data?.message || "Failed to create account")
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
          <p className="text-sm text-slate-500 mt-6">Create your account</p>
        </div>

        {apiError && (
          <div className="bg-red-50 border border-red-200 text-sm text-red-700 rounded-lg p-3 mb-4">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Company Name</label>
            <Input {...register("company_name")} placeholder="Acme Corp" />
            {errors.company_name && <p className="text-xs text-red-600">{errors.company_name.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Full Name</label>
            <Input {...register("full_name")} placeholder="Jane Doe" />
            {errors.full_name && <p className="text-xs text-red-600">{errors.full_name.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Email</label>
            <Input {...register("email")} placeholder="you@company.com" />
            {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Password</label>
            <Input {...register("password")} type="password" />
            {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Confirm Password</label>
            <Input {...register("confirm")} type="password" />
            {errors.confirm && <p className="text-xs text-red-600">{errors.confirm.message}</p>}
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full h-10 mt-2">
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create account"}
          </Button>
        </form>
      </div>
      
      <div className="text-center mt-6">
        <p className="text-sm text-slate-500">
          Already have an account? <Link href="/login" className="text-brand-600 hover:text-brand-700 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
