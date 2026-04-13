"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Loader2,
  FileText,
  AlertCircle,
  Sparkles,
  Copy,
  Layers,
  Clock,
  Database,
} from "lucide-react"
import type { TextChunk } from "@/lib/types"
import type { SummaryChunk, SummarizationStats } from "@/lib/services/summarization-service"
import { copyToClipboard } from "@/lib/utils"

interface SummaryTabProps {
  chunks: TextChunk[]
  summaries: SummaryChunk[]
  finalSummary: SummaryChunk | null
  isGenerating: boolean
  error: string
  stats: SummarizationStats | null
  requiresApiKey?: boolean
  processingStep: string
  onRegenerateSummary: () => void
  onSourceClick?: (chunkId: string) => void
}

export function SummaryTab({
  chunks,
  summaries,
  finalSummary,
  isGenerating,
  error,
  stats,
  requiresApiKey,
  processingStep,
  onSourceClick,
}: SummaryTabProps) {
  const busy = isGenerating || processingStep === "summarizing"

  // Helper function to get page numbers for source chunks
  const getSourcePageNumbers = (sourceChunkIds: string[]): Set<number> => {
    const pages = new Set<number>()
    sourceChunkIds.forEach((id) => {
      const chunk = chunks.find((c) => c.id === id)
      if (chunk) pages.add(chunk.pageNumber)
    })
    return pages
  }

  if (chunks.length === 0 && processingStep === "idle") {
    return <EmptyState />
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-5">
          {busy && <LoadingState count={chunks.length} />}

          {error && !busy && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-4 w-4 mt-0.5 text-destructive" />
                <div className="text-sm">
                  <p className="font-medium text-destructive">Summarization failed</p>
                  <p className="mt-1 text-muted-foreground">{error}</p>
                  {requiresApiKey && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Check that <code className="px-1 py-0.5 bg-muted rounded">OPENAI_API_KEY</code> is set and has credits.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {!busy && finalSummary && (
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold leading-tight">
                      {finalSummary.title || "Document summary"}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Synthesized from {finalSummary.sourceChunkIds.length} chunks
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={() => copyToClipboard(finalSummary.text)}
                  aria-label="Copy summary"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-4 whitespace-pre-wrap leading-relaxed text-sm">
                {finalSummary.text}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-1.5">
                <StatBadge>{finalSummary.wordCount} words</StatBadge>
                <StatBadge>{finalSummary.tokenCount} tokens</StatBadge>
                {stats && <StatBadge>{stats.model === "openai" ? "GPT-4o-mini" : "DistilBART"}</StatBadge>}
                {stats && (
                  <StatBadge icon={<Clock className="h-3 w-3" />}>
                    {(stats.processingTime / 1000).toFixed(1)}s
                  </StatBadge>
                )}
                {stats && stats.fromCache > 0 && (
                  <StatBadge icon={<Database className="h-3 w-3" />}>{stats.fromCache} cached</StatBadge>
                )}
              </div>

              {/* Source References */}
              {finalSummary.sourceChunkIds.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Source pages:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(getSourcePageNumbers(finalSummary.sourceChunkIds)).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => {
                          const sourceId = finalSummary.sourceChunkIds.find(
                            (id) => chunks.find((c) => c.id === id)?.pageNumber === pageNum
                          )
                          if (sourceId && onSourceClick) onSourceClick(sourceId)
                        }}
                        className="inline-flex items-center gap-1 rounded-full border bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300 cursor-pointer transition-colors"
                        title="Click to view in PDF"
                      >
                        <FileText className="h-3 w-3" />
                        p.{pageNum}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!busy && summaries.length > 0 && (
            <div className="rounded-2xl border bg-card">
              <div className="flex items-center gap-2 px-5 pt-4 pb-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">
                  Intermediate summaries
                  <span className="ml-1.5 text-muted-foreground font-normal">({summaries.length})</span>
                </h3>
              </div>
              <Accordion type="multiple" className="px-5 pb-2">
                {summaries.map((s) => (
                  <AccordionItem key={s.id} value={s.id}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="secondary" className="text-[10px]">
                          L{s.level}
                        </Badge>
                        <span className="truncate">{s.title}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                        {s.text}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <StatBadge>{s.wordCount} words</StatBadge>
                        <StatBadge>{s.tokenCount} tokens</StatBadge>
                        <StatBadge>{s.sourceChunkIds.length} sources</StatBadge>
                      </div>
                      {/* Source References for Intermediate Summaries */}
                      {s.sourceChunkIds.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Source pages:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {Array.from(getSourcePageNumbers(s.sourceChunkIds)).map((pageNum) => (
                              <button
                                key={pageNum}
                                onClick={() => {
                                  const sourceId = s.sourceChunkIds.find(
                                    (id) => chunks.find((c) => c.id === id)?.pageNumber === pageNum
                                  )
                                  if (sourceId && onSourceClick) onSourceClick(sourceId)
                                }}
                                className="inline-flex items-center gap-1 rounded-full border bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300 cursor-pointer transition-colors"
                                title="Click to view in PDF"
                              >
                                <FileText className="h-3 w-3" />
                                p.{pageNum}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}

          {!busy && !finalSummary && summaries.length === 0 && chunks.length > 0 && !error && (
            <PendingState count={chunks.length} />
          )}
        </div>
      </div>
    </div>
  )
}

function StatBadge({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
      {icon}
      {children}
    </span>
  )
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full p-6 text-muted-foreground">
      <div className="text-center max-w-xs">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <FileText className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium text-foreground">No document yet</p>
        <p className="mt-1 text-xs">Upload a PDF to generate an AI summary here.</p>
      </div>
    </div>
  )
}

function LoadingState({ count }: { count: number }) {
  return (
    <div className="rounded-2xl border bg-card p-6">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">Generating AI summary…</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Summarizing {count} chunks with smart rate limiting.
          </p>
        </div>
      </div>
      <div className="mt-5 space-y-2">
        <div className="h-3 w-full rounded bg-muted animate-pulse" />
        <div className="h-3 w-[92%] rounded bg-muted animate-pulse" />
        <div className="h-3 w-[85%] rounded bg-muted animate-pulse" />
        <div className="h-3 w-[70%] rounded bg-muted animate-pulse" />
      </div>
    </div>
  )
}

function PendingState({ count }: { count: number }) {
  return (
    <div className="rounded-2xl border border-dashed p-6 text-center">
      <Clock className="h-5 w-5 mx-auto text-muted-foreground" />
      <p className="mt-2 text-sm font-medium">Ready to summarize</p>
      <p className="text-xs text-muted-foreground">{count} chunks prepared.</p>
    </div>
  )
}
