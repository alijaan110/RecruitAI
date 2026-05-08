"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard, Building2, Users, Cpu, Mail, Activity, ArrowLeft, LogOut
} from "lucide-react"
import { cn } from "@/src/lib/utils"
import { adminAuth } from "@/src/lib/admin-api"

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/tenants", label: "Tenants", icon: Building2 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/llm", label: "LLM Settings", icon: Cpu },
  { href: "/admin/emails", label: "Email Logs", icon: Mail },
  { href: "/admin/system", label: "System", icon: Activity },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    adminAuth.clearKey()
    router.replace('/admin/login')
  }

  return (
    <div className="w-56 h-full flex-shrink-0 bg-slate-900 text-white flex flex-col">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-brand-600 flex items-center justify-center text-white font-bold text-sm">R</div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">RecruitAI Admin</span>
            <span className="text-[10px] text-slate-400 tracking-wider uppercase">Super Admin</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.map((item) => {
          const Icon = item.icon
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 h-9 px-3 rounded-lg text-sm transition-colors",
                isActive ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-slate-800 space-y-1">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 h-9 px-3 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to App
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 h-9 px-3 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-red-400"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  )
}
