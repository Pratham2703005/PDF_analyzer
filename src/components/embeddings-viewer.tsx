"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Loader2, Zap, RefreshCw, AlertCircle, CheckCircle, Database, Clock, Layers } from "lucide-react"
import type { TextChunk } from "@/lib/types"
import type { CacheInfo } from "@/hooks/use-embeddings"

interface EmbeddingsViewerProps {
  chunks: TextChunk[]
  chunksWithEmbeddings: TextChunk[]
  isGenerating: boolean
  error: string
  onGenerateEmbeddings: (chunks: TextChunk[]) => void
  onClearEmbeddings: () => void
  cacheInfo?: CacheInfo | null
  batchInfo?: {
    totalBatches: number
    batchSize: number
    processingTime: number
  }
}

export function EmbeddingsViewer({
  chunks,
  chunksWithEmbeddings,
  isGenerating,
  error,
  onGenerateEmbeddings,
  onClearEmbeddings,
  cacheInfo,
  batchInfo,
}: EmbeddingsViewerProps) {
  if (chunks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 p-6">
        <div className="text-center">
          <Zap className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p>No chunks available for embedding generation.</p>
          <p className="text-sm mt-2">Upload and process a PDF first.</p>
        </div>
      </div>
    )
  }

  const chunksWithEmbeddingsCount = chunksWithEmbeddings.filter((chunk) => chunk.embedding).length
  const estimatedBatches = Math.ceil(chunks.length / (chunks.length > 100 ? 20 : chunks.length > 50 ? 25 : 30))

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            <span className="font-medium">Vector Embeddings</span>
          </div>
          <div className="flex gap-2">
            {chunksWithEmbeddings.length > 0 && (
              <Button variant="outline" size="sm" onClick={onClearEmbeddings} disabled={isGenerating}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
            <Button onClick={() => onGenerateEmbeddings(chunks)} disabled={isGenerating} size="sm">
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Generate Embeddings
                </>
              )}
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {chunksWithEmbeddingsCount > 0 && !error && (
          <Alert className="mb-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-700 dark:text-green-300">
              Successfully processed {chunksWithEmbeddingsCount} chunk embeddings
              {cacheInfo && (
                <div className="flex items-center gap-4 mt-2 text-sm">
                  {cacheInfo.fromCache > 0 && (
                    <div className="flex items-center gap-1">
                      <Database className="h-3 w-3" />
                      {cacheInfo.fromCache} from cache
                    </div>
                  )}
                  {cacheInfo.newlyGenerated > 0 && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {cacheInfo.newlyGenerated} newly generated
                    </div>
                  )}
                  {batchInfo && (
                    <div className="flex items-center gap-1">
                      <Layers className="h-3 w-3" />
                      {batchInfo.totalBatches} batches ({(batchInfo.processingTime / 1000).toFixed(1)}s)
                    </div>
                  )}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="text-sm text-gray-600 dark:text-gray-400">
          {isGenerating ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing {chunks.length} chunks in batches...
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                Estimated {estimatedBatches} batches • Batch size:{" "}
                {chunks.length > 100 ? 20 : chunks.length > 50 ? 25 : 30} chunks
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                Using real embeddings (Xenova/all-MiniLM-L6-v2) • Database caching enabled
              </div>
            </div>
          ) : chunksWithEmbeddingsCount > 0 ? (
            <div className="space-y-1">
              <div>{chunksWithEmbeddingsCount} chunks with embeddings (384 dimensions each)</div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                API: /v4/generate_embeddings • Model: all-MiniLM-L6-v2 • Database: MongoDB + Prisma
              </div>
              {batchInfo && (
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  Processed in {batchInfo.totalBatches} batches • {(batchInfo.processingTime / 1000).toFixed(1)}s total
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <div>Ready to generate embeddings for {chunks.length} chunks</div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                Will process in ~{estimatedBatches} batches • Smart caching enabled
              </div>
            </div>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 p-1">
        <div className="p-4 space-y-4">
          {isGenerating ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Processing embeddings in batches...</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                  Batch processing prevents system overload and ensures stability
                </p>
                <div className="w-64 mx-auto">
                  <div className="text-xs text-gray-500 mb-1">
                    Estimated progress (batches will complete sequentially)
                  </div>
                  <Progress value={0} className="h-2" />
                </div>
              </div>
            </div>
          ) : chunksWithEmbeddings.length > 0 ? (
            chunksWithEmbeddings.map((chunk) => (
              <Card key={chunk.id} className="mb-4">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle className="text-sm font-medium">{chunk.title}</CardTitle>
                    <div className="flex gap-2">
                      {chunk.embedding ? (
                        <Badge variant="outline" className="text-xs">
                          384D Vector
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          No Embedding
                        </Badge>
                      )}
                      {chunk.fromCache !== undefined && (
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            chunk.fromCache
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          }`}
                        >
                          {chunk.fromCache ? (
                            <>
                              <Database className="h-3 w-3 mr-1" />
                              Cached
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3 mr-1" />
                              New
                            </>
                          )}
                        </Badge>
                      )}
                      {chunk.similarity && (
                        <Badge variant="secondary" className="text-xs">
                          {(chunk.similarity * 100).toFixed(1)}% sim
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Chunk ID: {chunk.id} | Page {chunk.pageNumber} | Level {chunk.level} | {chunk.wordCount} words |{" "}
                    {chunk.tokenCount} tokens
                  </div>
                  <div className="text-sm text-gray-800 dark:text-gray-200 mb-3 line-clamp-3">
                    {chunk.text.substring(0, 150)}
                    {chunk.text.length > 150 && "..."}
                  </div>
                  {chunk.embedding && (
                    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs">
                      <div className="font-mono text-gray-600 dark:text-gray-400 mb-1">
                        Vector Preview (first 10 dimensions):
                      </div>
                      <div className="font-mono text-gray-800 dark:text-gray-200">
                        [
                        {chunk.embedding
                          .slice(0, 10)
                          .map((v) => v.toFixed(3))
                          .join(", ")}
                        ...]
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Zap className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-gray-600 dark:text-gray-400 mb-2">No embeddings generated yet</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Click "Generate Embeddings" to process chunks
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                  Large batches will be processed in smaller chunks for stability
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
