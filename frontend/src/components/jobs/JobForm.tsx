"use client"

import * as React from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { JobCreate } from "@/types/job"

const jobSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  department: z.string().optional(),
  location: z.string().optional(),
  employment_type: z.enum(['full_time', 'part_time', 'contract', 'internship', 'remote']),
  description: z.string().min(20, "Description must be at least 20 characters"),
  salary_min: z.string().optional().transform(v => v ? parseInt(v) : undefined),
  salary_max: z.string().optional().transform(v => v ? parseInt(v) : undefined),
  salary_currency: z.string().default("USD"),
  closes_at: z.string().optional(),
  requirements: z.array(z.string()).min(1, "At least one requirement is needed"),
  nice_to_have: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
})

type JobFormValues = z.input<typeof jobSchema>

interface JobFormProps {
  initialData?: any;
  onSubmit: (data: JobCreate, publish: boolean) => Promise<void>;
  isSubmitting?: boolean;
}

export function JobForm({ initialData, onSubmit, isSubmitting }: JobFormProps) {
  const router = useRouter()
  const { register, control, handleSubmit, formState: { errors } } = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema),
    defaultValues: initialData || {
      employment_type: 'full_time',
      requirements: [],
      nice_to_have: [],
      keywords: [],
      salary_currency: 'USD'
    }
  })

  // We need to manage saving draft vs publish state.
  const [publishing, setPublishing] = React.useState(false);

  const handleFormSubmit = async (data: any) => {
    await onSubmit(data, publishing);
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8 max-w-2xl">
      {/* Section 1 */}
      <div>
        <h3 className="text-sm font-medium text-slate-900">Basic Info</h3>
        <div className="border-t border-surface-200 mt-1 mb-4" />
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-700">Job Title*</label>
            <Input {...register("title")} placeholder="e.g. Senior Frontend Engineer" />
            {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700">Department</label>
            <Input {...register("department")} placeholder="e.g. Engineering" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-700">Location</label>
              <Input {...register("location")} placeholder="e.g. New York, NY" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Employment Type*</label>
              <select 
                {...register("employment_type")}
                className="flex h-9 w-full rounded-md border border-surface-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
                <option value="remote">Remote</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2 */}
      <div>
        <h3 className="text-sm font-medium text-slate-900">Job Details</h3>
        <div className="border-t border-surface-200 mt-1 mb-4" />
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-700">Description*</label>
            <Textarea {...register("description")} className="min-h-[140px]" placeholder="Describe the role..." />
            {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-700">Salary Min</label>
              <Input {...register("salary_min")} type="number" placeholder="0" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Salary Max</label>
              <Input {...register("salary_max")} type="number" placeholder="0" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Currency</label>
              <select 
                {...register("salary_currency")}
                className="flex h-9 w-full rounded-md border border-surface-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
                <option value="PKR">PKR</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700">Closing Date</label>
            <Input {...register("closes_at")} type="date" />
          </div>
        </div>
      </div>

      {/* Section 3 */}
      <div>
        <h3 className="text-sm font-medium text-slate-900">Requirements*</h3>
        <div className="border-t border-surface-200 mt-1 mb-4" />
        <Controller
          name="requirements"
          control={control}
          render={({ field }) => <TagInput value={field.value || []} onChange={field.onChange} />}
        />
        {errors.requirements && <p className="text-xs text-red-600 mt-1">{errors.requirements.message}</p>}
        <p className="text-xs text-slate-400 mt-1">Press Enter to add each requirement</p>
      </div>

      {/* Section 4 */}
      <div>
        <h3 className="text-sm font-medium text-slate-900">Nice to Have</h3>
        <div className="border-t border-surface-200 mt-1 mb-4" />
        <Controller
          name="nice_to_have"
          control={control}
          render={({ field }) => <TagInput value={field.value || []} onChange={field.onChange} />}
        />
      </div>

      {/* Section 5 */}
      <div>
        <h3 className="text-sm font-medium text-slate-900">Scoring Keywords</h3>
        <div className="border-t border-surface-200 mt-1 mb-4" />
        <Controller
          name="keywords"
          control={control}
          render={({ field }) => <TagInput value={field.value || []} onChange={field.onChange} />}
        />
        <p className="text-xs text-slate-400 mt-1">These keywords score candidate CVs automatically</p>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-surface-200">
        <Button variant="outline" type="button" onClick={() => router.back()} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button 
          variant="outline" 
          className="border-brand-600 text-brand-600 hover:bg-brand-50"
          type="submit" 
          onClick={() => setPublishing(false)}
          disabled={isSubmitting}
        >
          {isSubmitting && !publishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Save as Draft
        </Button>
        {!initialData && (
          <Button 
            type="submit" 
            onClick={() => setPublishing(true)}
            disabled={isSubmitting}
          >
            {isSubmitting && publishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save & Publish
          </Button>
        )}
      </div>
    </form>
  )
}

function TagInput({ value = [], onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [inputVal, setInputVal] = React.useState("")

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const val = inputVal.trim()
      if (val && !value.includes(val)) {
        onChange([...value, val])
        setInputVal("")
      }
    }
  }

  const removeTag = (index: number) => {
    const newTags = [...value]
    newTags.splice(index, 1)
    onChange(newTags)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((tag, i) => (
          <div key={i} className="bg-surface-100 text-slate-700 text-xs px-2 py-0.5 rounded-md flex items-center gap-1">
            {tag}
            <button type="button" onClick={() => removeTag(i)} className="text-slate-400 hover:text-red-500">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      <Input 
        value={inputVal} 
        onChange={e => setInputVal(e.target.value)} 
        onKeyDown={handleKeyDown}
        placeholder="Type and press Enter..."
      />
    </div>
  )
}
