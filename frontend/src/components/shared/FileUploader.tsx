"use client"

import * as React from "react"
import { UploadCloud, Paperclip, X } from "lucide-react"
import { cn } from "@/src/lib/utils"

interface FileUploaderProps {
  onFileSelect: (f: File | null) => void;
  accept: string[];
  maxSizeMB: number;
  isLoading?: boolean;
  error?: string;
  selectedFile?: File | null;
}

export function FileUploader({
  onFileSelect,
  accept,
  maxSizeMB,
  isLoading,
  error: errorProp,
  selectedFile,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = React.useState(false)
  const [internalError, setInternalError] = React.useState<string>("");
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const validateAndSetFile = (f: File) => {
    setInternalError("");
    if (f.size > maxSizeMB * 1024 * 1024) {
      setInternalError(`File exceeds ${maxSizeMB}MB`);
      onFileSelect(null);
      return;
    }
    const ext = f.name.split('.').pop()?.toLowerCase();
    const isAccepted = accept.some(a => a.includes(ext || ''));
    if (!isAccepted && !accept.includes(f.type)) {
      setInternalError("Invalid file type");
      onFileSelect(null);
      return;
    }
    onFileSelect(f);
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0])
    }
  }

  const err = errorProp || internalError;

  if (selectedFile) {
    return (
      <div className="flex items-center justify-between p-4 border border-surface-200 rounded-xl bg-surface-50">
        <div className="flex items-center gap-3">
          <Paperclip className="w-5 h-5 text-brand-600" />
          <div>
            <p className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{selectedFile.name}</p>
            <p className="text-xs text-slate-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onFileSelect(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
          className="text-slate-400 hover:text-red-500 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    )
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={cn(
        "cursor-pointer border-2 border-dashed rounded-xl p-6 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
        isDragging ? "border-brand-400 bg-brand-50" : "border-surface-200 hover:bg-surface-50",
        err ? "border-red-300 bg-red-50" : ""
      )}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleChange}
        accept={accept.join(",")}
        className="hidden"
      />
      <div className="mx-auto w-8 h-8 flex items-center justify-center mb-3">
        <UploadCloud className={cn("w-8 h-8", err ? "text-red-400" : "text-slate-300")} />
      </div>
      <p className="text-sm font-medium text-slate-700">Drop your CV here or click to browse</p>
      <p className="text-xs text-slate-400 mt-1">PDF or DOCX, max {maxSizeMB}MB</p>
      {err && <p className="text-xs text-red-600 mt-2 font-medium">{err}</p>}
    </div>
  )
}
