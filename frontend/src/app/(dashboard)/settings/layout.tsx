"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { PageHeader } from "@/components/layout/PageHeader"
import { cn } from "@/lib/utils"

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const tabs = [
    { label: "General", href: "/settings" },
    { label: "Team", href: "/settings/team" },
    { label: "Billing", href: "/settings/billing" },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto h-full flex flex-col">
      <PageHeader title="Settings" subtitle="Manage your account preferences" />
      
      <div className="flex flex-col md:flex-row gap-8 flex-1">
        <aside className="w-full md:w-48 flex-shrink-0">
          <nav className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0">
            {tabs.map(tab => {
              const isActive = pathname === tab.href
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                    isActive 
                      ? "bg-brand-50 text-brand-700" 
                      : "text-slate-600 hover:bg-surface-100 hover:text-slate-900"
                  )}
                >
                  {tab.label}
                </Link>
              )
            })}
          </nav>
        </aside>
        
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
