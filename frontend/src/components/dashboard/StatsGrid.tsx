"use client"

import * as React from "react"
import { DashboardStats } from "@/src/lib/api"
import { Briefcase, Users, CalendarCheck, BarChart2, LucideIcon } from "lucide-react"
import { cn } from "@/src/lib/utils"

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconBgClass: string;
  iconColorClass: string;
  delta?: { value: number; label: string };
}

function StatCard({ title, value, icon: Icon, iconBgClass, iconColorClass, delta }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-surface-200 p-4">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", iconBgClass)}>
        <Icon className={cn("w-4 h-4", iconColorClass)} />
      </div>
      <div className="text-2xl font-semibold text-slate-900">{value}</div>
      <div className="flex items-center justify-between mt-0.5">
        <div className="text-xs text-slate-500">{title}</div>
        {delta && (
          <div className={cn("text-xs font-medium", delta.value >= 0 ? "text-green-600" : "text-red-500")}>
            {delta.value >= 0 ? "+" : ""}{delta.value} {delta.label}
          </div>
        )}
      </div>
    </div>
  )
}

export function StatsGrid({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard 
        title="Active Jobs" 
        value={stats.active_jobs} 
        icon={Briefcase} 
        iconBgClass="bg-brand-100" 
        iconColorClass="text-brand-600" 
      />
      <StatCard
        title="Applications (30d)"
        value={stats.total_apps_30d}
        icon={Users}
        iconBgClass="bg-blue-50"
        iconColorClass="text-blue-500"
      />
      <StatCard 
        title="In Interview" 
        value={stats.in_interview} 
        icon={CalendarCheck} 
        iconBgClass="bg-amber-50" 
        iconColorClass="text-amber-500" 
      />
      <StatCard 
        title="Avg Score" 
        value={`${stats.avg_score}%`} 
        icon={BarChart2} 
        iconBgClass="bg-purple-50" 
        iconColorClass="text-purple-500" 
      />
    </div>
  )
}
