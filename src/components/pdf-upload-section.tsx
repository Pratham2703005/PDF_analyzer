"use client"

import type React from "react"
import { useCallback, useRef, useState } from "react"
import { FileUp, Loader2, Sparkles, FileText, Zap } from "lucide-react"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface PdfUploadSectionProps {
  onFileSelect: (file: File) => void
  disabled: boolean
  isLoading: boolean
}

export function PdfUploadSection({ onFileSelect, disabled, isLoading }: PdfUploadSectionProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const open = () => {
    if (disabled) return
    inputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) onFileSelect(file)
    event.target.value = ""
  }

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      setIsDragging(false)
      if (disabled) return
      const file = event.dataTransfer.files[0]
      if (file && file.type === "application/pdf") onFileSelect(file)
    },
    [onFileSelect, disabled],
  )

  return (
    <Card className="h-full flex flex-col overflow-hidden border-0 bg-transparent shadow-none">
      <div
        onClick={open}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && open()}
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        onDrop={handleDrop}
        onDragEnter={(e) => {
          e.preventDefault()
          if (!disabled) setIsDragging(true)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setIsDragging(false)}
        className={cn(
          "relative flex-1 flex flex-col items-center justify-center gap-6 rounded-2xl border-2 border-dashed transition-all",
          "bg-surface-mesh",
          disabled && "opacity-60 cursor-not-allowed",
          !disabled && "cursor-pointer hover:border-primary/60",
          isDragging
            ? "border-primary scale-[1.01] ring-4 ring-primary/20"
            : "border-border/70",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled}
        />

        <div
          className={cn(
            "flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-all",
            isDragging && "scale-110",
          )}
        >
          {isLoading ? (
            <Loader2 className="h-9 w-9 animate-spin" />
          ) : (
            <FileUp className="h-9 w-9" />
          )}
        </div>

        <div className="text-center max-w-sm px-6">
          <h2 className="text-xl font-semibold tracking-tight">
            {isLoading
              ? "Loading PDF engine…"
              : isDragging
              ? "Drop it here"
              : "Drop your PDF here"}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            or <span className="text-foreground font-medium">click to browse</span>. Up to 50 MB.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 max-w-md w-full px-6 pb-2">
          <Feature icon={<FileText className="h-4 w-4" />} label="Extract" />
          <Feature icon={<Sparkles className="h-4 w-4" />} label="Summarize" />
          <Feature icon={<Zap className="h-4 w-4" />} label="Chat" />
        </div>
      </div>
    </Card>
  )
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-lg border bg-background/60 backdrop-blur px-3 py-2 text-xs font-medium text-muted-foreground">
      <span className="text-primary">{icon}</span>
      {label}
    </div>
  )
}
