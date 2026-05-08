"use client"

import * as React from "react"
import { useDashboardStats } from "@/hooks/useDashboard"
import { PageHeader } from "@/components/layout/PageHeader"
import { StatsGrid } from "@/components/dashboard/StatsGrid"
import { StageChart } from "@/components/dashboard/StageChart"
import { RecentApps } from "@/components/dashboard/RecentApps"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { auth } from "@/lib/auth"

export default function DashboardPage() {
  const { data: stats, isLoading, error } = useDashboardStats()
  const user = auth.getUser()

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader 
        title="Dashboard" 
        subtitle={`Welcome back, ${user?.full_name || 'User'}`} 
      />

      {isLoading && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <LoadingSkeleton className="h-32" />
            <LoadingSkeleton className="h-32" />
            <LoadingSkeleton className="h-32" />
            <LoadingSkeleton className="h-32" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <LoadingSkeleton className="h-[230px]" />
            </div>
            <LoadingSkeleton className="h-[300px]" />
          </div>
        </div>
      )}

      {error && !isLoading && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200">
          Failed to load dashboard statistics.
        </div>
      )}

      {stats && (
        <>
          <StatsGrid stats={stats} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2">
              <StageChart data={Object.entries(stats.apps_by_stage || {}).map(([name, count]) => ({ name, count: count as number }))} />
            </div>
            <div className="lg:col-span-1">
              <RecentApps apps={stats.recent_apps} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
