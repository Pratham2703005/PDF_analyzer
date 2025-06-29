"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  Loader2,
  FileText,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Layers,
  Sparkles,
  Copy,
  Cpu,
  Download,
  Zap,
} from "lucide-react"
import type { TextChunk } from "@/lib/types"
import type { SummaryChunk, SummarizationStats } from "@/lib/services/summarization-service"

interface SummaryViewerProps {
  chunks: TextChunk[]
  summaries: SummaryChunk[]
  finalSummary: SummaryChunk | null
  isGenerating: boolean
  error: string
  stats: SummarizationStats | null
  requiresApiKey?: boolean
  onGenerateSummaries: (chunks: TextChunk[]) => void
  onClearSummaries: () => void
  onCopyText: (text: string) => void
}

export function SummaryViewer({
  chunks,
  summaries,
  finalSummary,
  isGenerating,
  error,
  stats,
  requiresApiKey,
  onGenerateSummaries,
  onClearSummaries,
  onCopyText,
}: SummaryViewerProps) {
  if (chunks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 p-6">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p>No chunks available for summarization.</p>
          <p className="text-sm mt-2">Upload and process a PDF first.</p>
        </div>
      </div>
    )
  }

  // Calculate estimated processing time with DistilBART (faster than large models)
  const estimatedBatches = Math.ceil(chunks.length / 3) // Smaller batches for DistilBART
  const estimatedSeconds = estimatedBatches * 5 // ~5 seconds per batch with DistilBART

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <span className="font-medium">AI Summarization</span>
          </div>
          <div className="flex gap-2">
            {(summaries.length > 0 || finalSummary) && (
              <Button variant="outline" size="sm" onClick={onClearSummaries} disabled={isGenerating}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
            <Button onClick={() => onGenerateSummaries(chunks)} disabled={isGenerating} size="sm">
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Summarizing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Summary
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Local Processing Info */}
        {!isGenerating && chunks.length > 0 && (
          <Alert className="mb-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <Cpu className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              <div className="space-y-2">
                <p className="font-medium">Local AI Summarization</p>
                <p className="text-sm">
                  Using DistilBART model via Transformers.js - runs locally in your browser with no API keys required.
                </p>
                <p className="text-sm">
                  <strong>Estimated time:</strong> ~{Math.ceil(estimatedSeconds / 60)} minutes for {estimatedBatches}{" "}
                  batches
                </p>
                <div className="flex items-center gap-4 text-xs text-blue-600 dark:text-blue-400">
                  <div className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    Model downloads automatically on first use
                  </div>
                  <div className="flex items-center gap-1">
                    <Cpu className="h-3 w-3" />
                    Private & secure processing
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Summarization Error</p>
                <p className="text-sm">{error}</p>
                {error.includes("initialize") && (
                  <div className="text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded">
                    <p className="font-medium">Model Initialization Issues:</p>
                    <ul className="list-disc list-inside space-y-1 mt-1">
                      <li>Ensure you have a stable internet connection for model download</li>
                      <li>Check if your browser supports WebAssembly</li>
                      <li>Try refreshing the page and waiting for model download</li>
                      <li>Clear browser cache if the issue persists</li>
                    </ul>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {(summaries.length > 0 || finalSummary) && !error && (
          <Alert className="mb-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-700 dark:text-green-300">
              Successfully generated summaries using DistilBART model
              {stats && (
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {stats.totalProcessed} chunks processed
                  </div>
                  <div className="flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    {stats.processingSteps} steps
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {(stats.processingTime / 1000).toFixed(1)}s total
                  </div>
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
                Processing {chunks.length} chunks with DistilBART...
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                Local processing • Private & secure • Estimated completion: ~{Math.ceil(estimatedSeconds / 60)} minutes
              </div>
            </div>
          ) : finalSummary ? (
            <div className="space-y-1">
              <div>Final summary generated from {chunks.length} chunks</div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                Model: DistilBART (Transformers.js) • Private processing • Completed in{" "}
                {(stats?.processingTime || 0) / 1000} seconds
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div>Ready to summarize {chunks.length} chunks using local AI</div>
              <div className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-2">
                <Zap className="h-3 w-3" />
                DistilBART • No API required • Private processing • Estimated time: ~{Math.ceil(estimatedSeconds / 60)}{" "}
                minutes
              </div>
            </div>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 p-1">
        <div className="p-4 space-y-6">
          {isGenerating ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Generating AI summaries with DistilBART...
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                  Processing locally • Private & secure • No data sent to external servers
                </p>
                <div className="w-64 mx-auto">
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: "50%" }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Estimated: ~{Math.ceil(estimatedSeconds / 60)} minutes</p>
                </div>
              </div>
            </div>
          ) : finalSummary || summaries.length > 0 ? (
            <>
              {/* Final Summary */}
              {finalSummary && (
                <Card className="border-2 border-blue-200 dark:border-blue-800">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        {finalSummary.title}
                      </CardTitle>
                      <div className="flex gap-2">
                        <Badge
                          variant="default"
                          className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        >
                          Final Summary
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onCopyText(finalSummary.text)}
                          className="h-7 w-7 p-0"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Badge variant="outline" className="text-xs">
                        {finalSummary.wordCount} words
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {finalSummary.tokenCount} tokens
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        From {finalSummary.sourceChunkIds.length} chunks
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-xs bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300"
                      >
                        <Cpu className="h-3 w-3 mr-1" />
                        DistilBART
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <div className="whitespace-pre-wrap leading-relaxed">{finalSummary.text}</div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Intermediate Summaries */}
              {summaries.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Layers className="h-5 w-5" />
                      Intermediate Summaries ({summaries.length})
                    </h3>
                    <div className="space-y-4">
                      {summaries.map((summary) => (
                        <Card key={summary.id} className="border border-gray-200 dark:border-gray-700">
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">{summary.title}</CardTitle>
                              <div className="flex gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  Step {summary.level}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onCopyText(summary.text)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                              <Badge variant="outline" className="text-xs">
                                {summary.wordCount} words
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {summary.tokenCount} tokens
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {summary.sourceChunkIds.length} source chunks
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-2">
                            <div className="text-sm leading-relaxed whitespace-pre-wrap">
                              {summary.text.length > 300 ? `${summary.text.substring(0, 300)}...` : summary.text}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-gray-600 dark:text-gray-400 mb-2">No summaries generated yet</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Click "Generate Summary" to create AI-powered summaries
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                  Uses DistilBART • No API required • Private processing • Estimated time: ~
                  {Math.ceil(estimatedSeconds / 60)} minutes
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
