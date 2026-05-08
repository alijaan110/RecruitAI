"use client"

import * as React from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

const STAGE_COLORS: Record<string, string> = {
  received: '#94a3b8',
  screening: '#eab308',
  interview: '#3b82f6',
  offer: '#16a34a',
  hired: '#059669',
  rejected: '#ef4444'
};

export function StageChart({ data }: { data: Array<{ name: string; count: number }> }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white border border-surface-200 rounded-xl p-5 mb-6">
      <h3 className="text-sm font-medium text-slate-700 mb-4">Pipeline Overview</h3>
      <div className="h-[160px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis 
              dataKey="name" 
              type="category" 
              axisLine={false} 
              tickLine={false} 
              width={80} 
              tick={{ fontSize: 12, fill: '#64748b' }} 
            />
            <Tooltip 
              cursor={{ fill: '#f1f5f9' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#64748b', fontSize: 12 }}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={STAGE_COLORS[entry.name] || '#94a3b8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
