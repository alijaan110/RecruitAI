"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { adminAuth } from "@/src/lib/admin-api"
import { AdminSidebar } from "@/src/components/admin/AdminSidebar"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [checking, setChecking] = React.useState(true)

  const isLoginPage = pathname === '/admin/login'

  React.useEffect(() => {
    if (isLoginPage) {
      setChecking(false)
      return
    }
    if (!adminAuth.getKey()) {
      router.replace('/admin/login')
    } else {
      setChecking(false)
    }
  }, [router, isLoginPage])

  if (checking) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-100">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    )
  }

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  )
}
