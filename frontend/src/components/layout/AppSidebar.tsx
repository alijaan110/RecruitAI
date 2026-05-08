"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Briefcase, Users, Settings, LogOut } from "lucide-react"
import { cn, initials } from "@/lib/utils"
import { auth } from "@/lib/auth"

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  
  const user = auth.getUser()
  const tenant = auth.getTenant()
  
  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/jobs", label: "Jobs", icon: Briefcase },
    { href: "/candidates", label: "Candidates", icon: Users },
  ]

  const handleLogout = () => {
    auth.clearSession()
    router.push('/login')
  }

  return (
    <div className="w-56 h-full flex flex-col bg-white border-r border-surface-200 flex-shrink-0 relative hidden md:flex">
      {/* Section 1 - Branding */}
      <div className="p-4 border-b border-surface-100 flex-shrink-0">
        <Link href="/dashboard" className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-brand-500/20 blur-md"></div>
              <span className="text-white font-bold text-lg leading-none relative z-10">R</span>
              <span className="text-brand-500 font-bold text-lg leading-none relative z-10">.</span>
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">RecruitAI</span>
          </div>
          <span className="text-[10px] text-brand-600 font-bold tracking-widest uppercase pl-1 mt-0.5">Automated Hiring</span>
        </Link>
      </div>

      {/* Section 2 - Navigation */}
      <div className="p-3 flex flex-col flex-1 overflow-y-auto">
        <h3 className="text-[10px] font-semibold text-slate-400 tracking-widest uppercase px-2 mb-2">Menu</h3>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            const Icon = item.icon
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 h-9 px-3 rounded-lg text-sm transition-colors duration-150",
                  isActive 
                    ? "bg-brand-50 text-brand-600 font-medium" 
                    : "text-slate-600 hover:bg-surface-100 hover:text-slate-900"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        
        <div className="mt-auto border-t border-surface-200 p-3 -mx-3" />
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2.5 h-9 px-3 rounded-lg text-sm transition-colors duration-150",
            pathname.startsWith('/settings')
              ? "bg-brand-50 text-brand-600 font-medium" 
              : "text-slate-600 hover:bg-surface-100 hover:text-slate-900"
          )}
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
      </div>

      {/* Section 3 - User profile */}
      <div className="border-t border-surface-100 p-3 flex items-center gap-3 flex-shrink-0">
        <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 text-xs font-medium flex-shrink-0 flex items-center justify-center uppercase">
          {initials(user?.full_name)}
        </div>
        <div className="flex flex-col min-w-0 pr-1">
          <span className="text-sm text-slate-900 font-medium truncate">{user?.full_name}</span>
          <span className="text-xs text-slate-400 capitalize truncate">{user?.role}</span>
        </div>
        <button 
          onClick={handleLogout}
          className="ml-auto text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
