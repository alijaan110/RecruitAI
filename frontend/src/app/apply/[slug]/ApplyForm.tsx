"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CheckCircle2, Loader2 } from "lucide-react"
import { Input } from "@/src/components/ui/input"
import { Textarea } from "@/src/components/ui/textarea"
import { Button } from "@/src/components/ui/button"
import { FileUploader } from "@/src/components/shared/FileUploader"
import { applicationsApi } from "@/src/lib/api"
import { PublicJob } from "@/src/types/job"
import { toast } from "sonner"

const applySchema = z.object({
  full_name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  linkedin_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  portfolio_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  cover_letter: z.string().max(1000, "Max 1000 characters").optional(),
})

type ApplyFormValues = z.infer<typeof applySchema>

export function ApplyForm({ job }: { job: PublicJob }) {
  const [file, setFile] = React.useState<File | null>(null)
  const [success, setSuccess] = React.useState(false)
  const [apiError, setApiError] = React.useState<string | null>(null)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<ApplyFormValues>({
    resolver: zodResolver(applySchema)
  })

  const coverLetter = watch("cover_letter") || ""

  const onSubmit = async (data: ApplyFormValues) => {
    setApiError(null)
    if (!file) {
      toast.error("Please upload your CV")
      return
    }

    try {
      const formData = new FormData()
      formData.append("job_id", job.id)
      formData.append("full_name", data.full_name)
      formData.append("email", data.email)
      if (data.phone) formData.append("phone", data.phone)
      if (data.linkedin_url) formData.append("linkedin_url", data.linkedin_url)
      if (data.portfolio_url) formData.append("portfolio_url", data.portfolio_url)
      if (data.cover_letter) formData.append("cover_letter", data.cover_letter)
      formData.append("cv_file", file)

      await applicationsApi.submitPublic(formData)
      setSuccess(true)
    } catch (err: any) {
      const status = err.response?.status
      const msg = err.response?.data?.error || err.response?.data?.detail || err.message || "Submission failed"
      if (status === 409) {
        toast.error("You've already applied to this job")
      } else if (status === 402) {
        toast.error("Applications are temporarily unavailable")
      } else if (status === 413) {
        toast.error("File too large (max 10MB)")
      } else {
        toast.error("Could not submit application", { description: msg })
      }
      setApiError(msg)
    }
  }

  if (success) {
    return (
      <div className="bg-brand-50 border border-brand-200 rounded-xl p-8 flex flex-col items-center justify-center text-center">
        <CheckCircle2 className="w-12 h-12 text-brand-600 mb-4" />
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Application submitted!</h2>
        <p className="text-sm text-slate-500">
          Thank you, we'll be in touch.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-surface-200 rounded-xl p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900 mb-6">Apply for this position</h2>

      {apiError && (
        <div className="bg-red-50 border border-red-200 text-sm text-red-700 rounded-lg p-3 mb-6">
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-xs font-medium text-slate-700">Full Name *</label>
          <Input {...register("full_name")} placeholder="Jane Doe" className="mt-1" />
          {errors.full_name && <p className="text-xs text-red-600 mt-1">{errors.full_name.message}</p>}
        </div>

        <div>
          <label className="text-xs font-medium text-slate-700">Email *</label>
          <Input {...register("email")} type="email" placeholder="jane@example.com" className="mt-1" />
          {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="text-xs font-medium text-slate-700">Phone</label>
          <Input {...register("phone")} type="tel" placeholder="+1 (555) 000-0000" className="mt-1" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-700">LinkedIn URL</label>
            <Input {...register("linkedin_url")} type="url" placeholder="https://linkedin.com/..." className="mt-1" />
            {errors.linkedin_url && <p className="text-xs text-red-600 mt-1">{errors.linkedin_url.message}</p>}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700">Portfolio URL</label>
            <Input {...register("portfolio_url")} type="url" placeholder="https://..." className="mt-1" />
            {errors.portfolio_url && <p className="text-xs text-red-600 mt-1">{errors.portfolio_url.message}</p>}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-end mb-1">
            <label className="text-xs font-medium text-slate-700">Cover Letter</label>
            <span className="text-xs text-slate-400">{coverLetter.length}/1000</span>
          </div>
          <Textarea 
            {...register("cover_letter")} 
            className="min-h-[100px]" 
            maxLength={1000}
            placeholder="Introduce yourself..." 
          />
          {errors.cover_letter && <p className="text-xs text-red-600 mt-1">{errors.cover_letter.message}</p>}
        </div>

        <div className="pt-2">
          <label className="text-xs font-medium text-slate-700 block mb-2">CV Upload *</label>
          <FileUploader 
            onFileSelect={setFile} 
            selectedFile={file}
            accept={['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']} 
            maxSizeMB={10} 
          />
        </div>

        <div className="pt-4 mt-6 border-t border-surface-200">
          <Button type="submit" disabled={isSubmitting} className="w-full h-10 text-sm">
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            Submit Application
          </Button>
        </div>
      </form>
    </div>
  )
}
