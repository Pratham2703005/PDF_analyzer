"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Layers,
  Sparkles,
  Copy,
  Cpu,
  Zap,
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
  onRegenerateSummary,
}: SummaryTabProps) {
  const handleCopyText = async (text: string) => {
    await copyToClipboard(text)
  }

  if (chunks.length === 0 && processingStep === "idle") {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 p-6">
        <div className="text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-lg mb-2">No PDF uploaded yet</p>
          <p className="text-sm">Upload a PDF file to generate AI summaries</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <span className="font-medium">AI Summary</span>
          </div>

          {(summaries.length > 0 || finalSummary) && !isGenerating && (
            <Button variant="outline" size="sm" onClick={onRegenerateSummary} className="text-xs">
              Regenerate
            </Button>
          )}
        </div>

        {/* Processing Status */}
        {(isGenerating || processingStep === "summarizing") && (
          <Alert className="mb-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              <div className="space-y-2">
                <p className="font-medium">Generating AI Summary with OpenAI GPT-4o-mini</p>
                <p className="text-sm">Processing {chunks.length} chunks with smart rate limiting...</p>
                <p className="text-xs">Fast processing • High quality results • Auto fallback to local model</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Summarization Error</p>
                <p className="text-sm">{error}</p>
                {requiresApiKey && (
                  <div className="text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded">
                    <p className="font-medium">OpenAI API Issues:</p>
                    <ul className="list-disc list-inside space-y-1 mt-1">
                      <li>Ensure OPENAI_API_KEY is configured in environment variables</li>
                      <li>Check if you have sufficient API credits</li>
                      <li>System will automatically fallback to local model if needed</li>
                    </ul>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Success State */}
        {(summaries.length > 0 || finalSummary) && !error && (
          <Alert className="mb-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-700 dark:text-green-300">
              Successfully generated AI summary using{" "}
              {stats?.model === "openai" ? "OpenAI GPT-4o-mini" : "local DistilBART"}
              {stats?.fallbackUsed && (
                <span className="text-orange-600 dark:text-orange-400"> (with fallback to local model)</span>
              )}
              {stats?.rateLimitHit && (
                <span className="text-yellow-600 dark:text-yellow-400"> (rate limit handled gracefully)</span>
              )}
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
                  {stats.fromCache > 0 && (
                    <div className="flex items-center gap-1">
                      <Database className="h-3 w-3" />
                      {stats.fromCache} cached
                    </div>
                  )}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Processing Info */}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {isGenerating || processingStep === "summarizing" ? (
            <div className="space-y-1">
              <div>Processing {chunks.length} chunks with OpenAI GPT-4o-mini...</div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                Smart rate limiting • Auto fallback • 90K tokens/min limit
              </div>
            </div>
          ) : finalSummary ? (
            <div className="space-y-1">
              <div>Summary generated from {chunks.length} chunks</div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                Model: {stats?.model === "openai" ? "OpenAI GPT-4o-mini" : "DistilBART (Local)"} • Processing time:{" "}
                {(stats?.processingTime || 0) / 1000}s •
                {stats?.fromCache ? `${stats.fromCache} cached, ${stats.newlyGenerated} new` : "All new"}
              </div>
            </div>
          ) : chunks.length > 0 ? (
            <div className="space-y-1">
              <div>Ready to summarize {chunks.length} chunks</div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                Will use OpenAI GPT-4o-mini for fast, high-quality summarization with smart rate limiting
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-500 dark:text-gray-500">Waiting for PDF processing to complete...</div>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {isGenerating || processingStep === "summarizing" ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-500" />
                <p className="text-lg font-medium mb-2">Generating AI Summary</p>
                <p className="text-sm text-muted-foreground mb-4">OpenAI is analyzing your document...</p>
                <div className="w-64 mx-auto">
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: "60%" }} />
                  </div>
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
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />
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
                          onClick={() => handleCopyText(finalSummary.text)}
                          className="h-8 w-8 p-0"
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
                        {stats?.model === "openai" ? (
                          <>
                            <Zap className="h-3 w-3 mr-1" />
                            GPT-4o-mini
                          </>
                        ) : (
                          <>
                            <Cpu className="h-3 w-3 mr-1" />
                            DistilBART
                          </>
                        )}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <div className="whitespace-pre-wrap leading-relaxed text-base">{finalSummary.text}</div>
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
                                  onClick={() => handleCopyText(summary.text)}
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
                            <div className="text-sm leading-relaxed whitespace-pre-wrap">{summary.text}</div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          ) : chunks.length > 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-lg font-medium mb-2">Ready to Generate Summary</p>
                <p className="text-sm text-muted-foreground">{chunks.length} chunks are ready for AI summarization</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-lg font-medium mb-2">Processing Document</p>
                <p className="text-sm text-muted-foreground">Please wait while we extract and chunk your PDF...</p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
