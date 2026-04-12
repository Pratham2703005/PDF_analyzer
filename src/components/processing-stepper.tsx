"use client"

import * as React from "react"
import { Check, X } from "lucide-react"

import { cn } from "@/lib/utils"

export type ProcessingStep =
  | "idle"
  | "extracting"
  | "chunking"
  | "summarizing"
  | "embedding"
  | "saving"
  | "complete"
  | "error"

const STEPS: { key: ProcessingStep; label: string }[] = [
  { key: "extracting", label: "Extract" },
  { key: "chunking", label: "Chunk" },
  { key: "summarizing", label: "Summarize" },
  { key: "embedding", label: "Embed" },
  { key: "saving", label: "Save" },
]

const ORDER: Record<Exclude<ProcessingStep, "idle" | "complete" | "error">, number> = {
  extracting: 0,
  chunking: 1,
  summarizing: 2,
  embedding: 3,
  saving: 4,
}

export function ProcessingStepper({
  step,
  progress,
  message,
}: {
  step: ProcessingStep
  progress: number
  message: string
}) {
  const isError = step === "error"
  const isDone = step === "complete"
  const activeIdx = isDone
    ? STEPS.length
    : step === "idle" || isError
    ? -1
    : ORDER[step as keyof typeof ORDER]

  const filledPct = isDone
    ? 100
    : activeIdx <= 0
    ? 0
    : Math.min(100, (activeIdx / (STEPS.length - 1)) * 100)

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-4">
        <p
          className={cn(
            "text-sm font-medium truncate",
            isError && "text-destructive",
            isDone && "text-emerald-600 dark:text-emerald-400",
          )}
        >
          {message}
        </p>
        <span className="text-xs tabular-nums text-muted-foreground">{progress}%</span>
      </div>

      <div className="mt-3 relative">
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-border rounded-full" />
        <div
          className={cn(
            "absolute left-0 top-1/2 -translate-y-1/2 h-[2px] rounded-full transition-all duration-500",
            isError ? "bg-destructive" : "bg-primary",
          )}
          style={{ width: `${filledPct}%` }}
        />
        <ol className="relative flex items-center justify-between">
          {STEPS.map((s, i) => {
            const done = i < activeIdx || isDone
            const active = i === activeIdx && !isDone
            return (
              <li key={s.key} className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "relative flex h-6 w-6 items-center justify-center rounded-full border-2 bg-background transition-all",
                    done && "border-primary bg-primary text-primary-foreground",
                    active && !isError && "border-primary ring-4 ring-primary/20",
                    isError && active && "border-destructive ring-4 ring-destructive/20",
                    !done && !active && "border-border",
                  )}
                >
                  {isError && active ? (
                    <X className="h-3 w-3 text-destructive" />
                  ) : done ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : active ? (
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  ) : null}
                </div>
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-wider",
                    (done || active) ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {s.label}
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
