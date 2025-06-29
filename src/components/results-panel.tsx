"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Hash, FileText, Zap, Sparkles } from "lucide-react"
import { ChunkList } from "./chunk-list"
import { StatsDisplay } from "./stats-display"
import { RawTextViewer } from "./raw-text-viewer"
import { EmbeddingsViewer } from "./embeddings-viewer"
import { SummaryViewer } from "./summary_viewer"
import type { TextChunk, ChunkingStats } from "@/lib/types"
import type { CacheInfo } from "@/hooks/use-embeddings"
import type { SummaryChunk, SummarizationStats } from "@/lib/services/summarization-service"

interface ResultsPanelProps {
  chunks: TextChunk[]
  stats: ChunkingStats | null
  rawText: string
  chunksWithEmbeddings: TextChunk[]
  isLoading: boolean
  isChunking: boolean
  isGeneratingEmbeddings: boolean
  embeddingError: string
  embeddingCacheInfo: CacheInfo | null
  embeddingBatchInfo?: {
    totalBatches: number
    batchSize: number
    processingTime: number
  }
  summaries: SummaryChunk[]
  finalSummary: SummaryChunk | null
  isGeneratingSummaries: boolean
  summaryError: string
  summaryStats: SummarizationStats | null
  summaryRequiresApiKey: boolean
  onCopy: (text: string) => void
  onChunkClick: (chunk: TextChunk) => void
  onGenerateEmbeddings: (chunks: TextChunk[]) => void
  onClearEmbeddings: () => void
  onGenerateSummaries: (chunks: TextChunk[]) => void
  onClearSummaries: () => void
}

export function ResultsPanel({
  chunks,
  stats,
  rawText,
  chunksWithEmbeddings,
  isLoading,
  isChunking,
  isGeneratingEmbeddings,
  embeddingError,
  embeddingCacheInfo,
  embeddingBatchInfo,
  summaries,
  finalSummary,
  isGeneratingSummaries,
  summaryError,
  summaryStats,
  summaryRequiresApiKey,
  onCopy,
  onChunkClick,
  onGenerateEmbeddings,
  onClearEmbeddings,
  onGenerateSummaries,
  onClearSummaries,
}: ResultsPanelProps) {
  const isProcessing = isLoading || isChunking
  const embeddingsCount = chunksWithEmbeddings.filter((chunk) => chunk.embedding).length
  const summariesCount = summaries.length + (finalSummary ? 1 : 0)

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="w-5 h-5" />
          Analysis Results
        </CardTitle>
        <CardDescription>
          View extracted text, semantic chunks, embeddings, AI summaries, and processing statistics.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        {isProcessing ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <p>{isLoading ? "Processing PDF..." : "Generating chunks..."}</p>
          </div>
        ) : chunks.length > 0 || rawText || stats ? (
          <Tabs defaultValue="raw" className="h-full flex flex-col">
            <TabsList className="mx-6 mt-0 mb-2 shrink-0">
              <TabsTrigger value="raw">Raw Text</TabsTrigger>
              <TabsTrigger value="chunks">Chunks ({chunks.length})</TabsTrigger>
              <TabsTrigger value="embeddings">
                <Zap className="w-4 h-4 mr-1" />
                Embeddings ({embeddingsCount})
              </TabsTrigger>
              <TabsTrigger value="summaries">
                <Sparkles className="w-4 h-4 mr-1" />
                Summaries ({summariesCount})
              </TabsTrigger>
              <TabsTrigger value="stats">Statistics</TabsTrigger>
            </TabsList>

            <TabsContent value="raw" className="flex-1 overflow-y-auto mt-0">
              <RawTextViewer rawText={rawText} onCopyAll={onCopy} />
            </TabsContent>

            <TabsContent value="chunks" className="flex-1 overflow-y-auto mt-0">
              <ChunkList chunks={chunks} onCopyChunk={onCopy} onChunkClick={onChunkClick} />
            </TabsContent>

            <TabsContent value="embeddings" className="flex-1 overflow-y-auto mt-0">
              <EmbeddingsViewer
                chunks={chunks}
                chunksWithEmbeddings={chunksWithEmbeddings}
                isGenerating={isGeneratingEmbeddings}
                error={embeddingError}
                cacheInfo={embeddingCacheInfo}
                batchInfo={embeddingBatchInfo}
                onGenerateEmbeddings={onGenerateEmbeddings}
                onClearEmbeddings={onClearEmbeddings}
              />
            </TabsContent>

            <TabsContent value="summaries" className="flex-1 overflow-y-auto mt-0">
              <SummaryViewer
                chunks={chunks}
                summaries={summaries}
                finalSummary={finalSummary}
                isGenerating={isGeneratingSummaries}
                error={summaryError}
                stats={summaryStats}
                requiresApiKey={summaryRequiresApiKey}
                onGenerateSummaries={onGenerateSummaries}
                onClearSummaries={onClearSummaries}
                onCopyText={onCopy}
              />
            </TabsContent>

            <TabsContent value="stats" className="flex-1 overflow-y-auto mt-0">
              <StatsDisplay stats={stats} />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-lg mb-2">No PDF processed yet</p>
              <p className="text-sm">Upload a PDF file to see analysis results here</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
