"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { useCandidates } from "@/src/hooks/useCandidates"
import { Candidate } from "@/src/types/candidate"
import { PageHeader } from "@/src/components/layout/PageHeader"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { DataTable } from "@/src/components/shared/DataTable"
import { ScoreBadge } from "@/src/components/candidates/ScoreBadge"
import { formatDate, initials } from "@/src/lib/utils"
import { ColumnDef } from "@tanstack/react-table"

export default function CandidatesPage() {
  const router = useRouter()
  const [search, setSearch] = React.useState("")
  const [source, setSource] = React.useState("all")
  
  const { data, isLoading } = useCandidates({ 
    search, 
    source: source !== "all" ? source : undefined 
  })

  const columns: ColumnDef<Candidate>[] = [
    {
      accessorKey: "full_name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold flex items-center justify-center uppercase flex-shrink-0">
             {initials(row.original.full_name)}
           </div>
           <div>
             <div className="text-sm font-medium text-slate-900">{row.original.full_name}</div>
             <div className="text-xs text-slate-400">{row.original.email}</div>
           </div>
        </div>
      )
    },
    { 
      accessorKey: "source", 
      header: "Source", 
      cell: ({ row }) => (
        <span className="text-xs bg-surface-100 text-slate-500 px-2 py-0.5 rounded capitalize">
          {row.original.source}
        </span>
      ) 
    },
    { 
      accessorKey: "total_applications", 
      header: "Applications", 
      cell: ({ row }) => (
        <span className="bg-surface-200 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium">
          {row.original.total_applications || 0}
        </span>
      ) 
    },
    { 
      accessorKey: "highest_score", 
      header: "Highest Score", 
      cell: ({ row }) => <ScoreBadge score={row.original.highest_score} /> 
    },
    { 
      accessorKey: "created_at", 
      header: "Last Activity", 
      cell: ({ row }) => <span className="text-xs text-slate-400">{formatDate(row.original.created_at)}</span> 
    },
    {
      id: "actions",
      cell: ({ row }) => {
        return (
          <Button variant="outline" size="sm" onClick={() => router.push(`/candidates/${row.original.id}`)}>
            View
          </Button>
        )
      }
    }
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader title="Candidates" />

      <div className="mb-4 flex items-center gap-3">
        <div className="relative w-[300px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search candidates..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select 
          className="h-9 rounded-md border border-surface-300 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          <option value="all">All Sources</option>
          <option value="direct">Direct</option>
          <option value="linkedin">LinkedIn</option>
          <option value="indeed">Indeed</option>
          <option value="rozee">Rozee</option>
          <option value="referral">Referral</option>
        </select>
      </div>

      <DataTable 
        columns={columns} 
        data={data?.items || []} 
        isLoading={isLoading} 
      />
    </div>
  )
}
