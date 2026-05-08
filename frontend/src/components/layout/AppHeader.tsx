"use client"

import * as React from "react"
import { Bell } from "lucide-react"
import { auth } from "@/lib/auth"
import { initials } from "@/lib/utils"

export function AppHeader() {
  const user = auth.getUser()

  return (
    <header className="h-14 bg-white border-b border-surface-200 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex-1" />
      <div className="flex items-center gap-4">
        <button className="text-slate-400 hover:text-slate-600 relative">
          <Bell className="w-5 h-5" />
          {/* Example notification dot */}
          {/* <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white" /> */}
        </button>
        <div className="w-px h-6 bg-surface-200 mx-1" />
        <button className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 text-sm font-medium flex items-center justify-center uppercase border border-brand-100">
          {initials(user?.full_name)}
        </button>
      </div>
    </header>
  )
}
