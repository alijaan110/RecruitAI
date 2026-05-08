"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search, Plus, MoreHorizontal, ArrowRight, Pencil, Trash, XCircle, Play } from "lucide-react"
import { useJobs, usePublishJob, useCloseJob } from "@/hooks/useJobs"
import { Job } from "@/types/job"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable } from "@/components/shared/DataTable"
import { JobStatusBadge } from "@/components/jobs/JobStatusBadge"
import { ScoreBadge } from "@/components/candidates/ScoreBadge"
import { formatDate } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { ColumnDef } from "@tanstack/react-table"

export default function JobsPage() {
  const router = useRouter()
  const [status, setStatus] = React.useState<string>("all")
  const [search, setSearch] = React.useState("")
  
  const { data, isLoading } = useJobs({ status: status !== "all" ? status : undefined, search })
  const publishMutation = usePublishJob()
  const closeMutation = useCloseJob()

  const columns: ColumnDef<Job>[] = [
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-900 text-sm cursor-pointer hover:underline" onClick={() => router.push(`/jobs/${row.original.id}/pipeline`)}>
            {row.original.title}
          </span>
          <div className="mt-1">
             <span className="text-xs bg-surface-100 text-slate-500 px-1.5 py-0.5 rounded capitalize">
               {row.original.employment_type.replace('_', ' ')}
             </span>
          </div>
        </div>
      )
    },
    { accessorKey: "department", header: "Department", cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.department || "—"}</span> },
    { accessorKey: "location", header: "Location", cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.location || "—"}</span> },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <JobStatusBadge status={row.original.status} /> },
    { 
      accessorKey: "total_applications", 
      header: "Applications", 
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-sm">
           <UsersIcon className="w-4 h-4 text-slate-400" />
           {row.original.total_applications}
        </div>
      ) 
    },
    { accessorKey: "avg_score", header: "Avg Score", cell: ({ row }) => <ScoreBadge score={row.original.avg_score} /> },
    { accessorKey: "created_at", header: "Created", cell: ({ row }) => <span className="text-xs text-slate-400">{formatDate(row.original.created_at)}</span> },
    {
      id: "actions",
      cell: ({ row }) => {
        const job = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/jobs/${job.id}/pipeline`)}>
                <ArrowRight className="mr-2 h-4 w-4" /> View Pipeline
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/jobs/${job.id}/edit`)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit Job
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {job.status === 'draft' && (
                <DropdownMenuItem onClick={() => publishMutation.mutate(job.id)}>
                  <Play className="mr-2 h-4 w-4" /> Publish
                </DropdownMenuItem>
              )}
              {job.status === 'published' && (
                <DropdownMenuItem onClick={() => closeMutation.mutate(job.id)}>
                  <XCircle className="mr-2 h-4 w-4" /> Close
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-700">
                <Trash className="mr-2 h-4 w-4" /> Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
    }
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader title="Jobs">
        <Button onClick={() => router.push("/jobs/new")}>
          <Plus className="w-4 h-4 mr-2" /> New Job
        </Button>
      </PageHeader>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="relative w-[300px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search jobs..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Tabs value={status} onValueChange={setStatus}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="published">Published</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="closed">Closed</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <DataTable 
        columns={columns} 
        data={data?.items || []} 
        isLoading={isLoading} 
      />
    </div>
  )
}

function UsersIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
