"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Sparkles, AlertCircle, FileText, X } from "lucide-react"
import { toast } from "robot-toast";

import { usePdfExtractor } from "@/hooks/use-pdf-extractor"
import { useTextChunker } from "@/hooks/use-text-chunker"
import { useEmbeddings } from "@/hooks/use-embeddings"
import { useSummarization } from "@/hooks/use-summarization"

import { PdfUploadSection } from "@/components/pdf-upload-section"
import { PdfViewerSection } from "@/components/pdf-viewer-section"
import { SummaryTab } from "@/components/summary-tab"
import { ChatTab } from "@/components/chat-tab"
import { ProcessingStepper, type ProcessingStep } from "@/components/processing-stepper"
import { DocumentActionsMenu } from "@/components/document-actions-menu"
import { ThemeToggle } from "@/components/theme-toggle"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function Home() {
  // PDF extraction
  const {
    pdfJsLoaded,
    isLoading: isExtracting,
    error: extractionError,
    fileName,
    extractedText,
    pdfDoc,
    pdfFile,
    extractTextFromPdf,
    setError: setExtractionError,
  } = usePdfExtractor()

  const { chunks, stats, isChunking, chunkText } = useTextChunker()

  const {
    chunksWithEmbeddings,
    isGenerating: isGeneratingEmbeddings,
    error: embeddingError,
    generateEmbeddings,
    clearEmbeddings,
  } = useEmbeddings()

  const {
    summaries,
    finalSummary,
    isGenerating: isGeneratingSummaries,
    error: summaryError,
    requiresApiKey: summaryRequiresApiKey,
    stats: summaryStats,
    generateSummaries,
    clearSummaries,
  } = useSummarization()

  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [currentPdfPage, setCurrentPdfPage] = useState<number>(1)
  const [processingStep, setProcessingStep] = useState<ProcessingStep>("idle")
  const [processingProgress, setProcessingProgress] = useState(0)
  const [chatEnabled, setChatEnabled] = useState(false)
  const [activeTab, setActiveTab] = useState("summary")
  const [errorDismissed, setErrorDismissed] = useState(false)
  const [statusVisible, setStatusVisible] = useState(false)

  // Monotonic run id so late responses from cancelled pipelines can't corrupt new state.
  const runIdRef = useRef(0)

  const cascadeRunIdRef = useRef(0)

  useEffect(() => {
    if (extractedText && fileName && pdfDoc && processingStep === "extracting") {
      setProcessingStep("chunking")
      setProcessingProgress(25)
      chunkText(extractedText, fileName, pdfDoc.numPages)
    }
  }, [extractedText, fileName, pdfDoc, chunkText, processingStep])

  useEffect(() => {
    if (chunks.length > 0 && processingStep === "chunking" && !isChunking) {
      setProcessingStep("summarizing")
      setProcessingProgress(40)
      generateSummaries(chunks, "openai")
    }
  }, [chunks, isChunking, processingStep, generateSummaries])

  useEffect(() => {
    if ((summaries.length > 0 || finalSummary) && processingStep === "summarizing" && !isGeneratingSummaries) {
      setProcessingStep("embedding")
      setProcessingProgress(60)
      generateEmbeddings(chunks)
    }
  }, [summaries, finalSummary, isGeneratingSummaries, processingStep, generateEmbeddings, chunks])

  const saveSummariesToDatabase = useCallback(async () => {
    if (!summaries.length && !finalSummary) return
    const currentRun = ++cascadeRunIdRef.current
    try {
      const response = await fetch("/api/v4/save_summaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summaries, finalSummary }),
      })
      if (currentRun !== cascadeRunIdRef.current) return
      if (!response.ok) throw new Error("Failed to save summaries to database")
      await response.json()
      setProcessingStep("complete")
      setProcessingProgress(100)
      setChatEnabled(true)
    } catch {
      if (currentRun !== cascadeRunIdRef.current) return
      setProcessingStep("error")
    }
  }, [summaries, finalSummary])

  useEffect(() => {
    if (chunksWithEmbeddings.length > 0 && processingStep === "embedding" && !isGeneratingEmbeddings) {
      setProcessingStep("saving")
      setProcessingProgress(80)
      saveSummariesToDatabase()
    }
  }, [chunksWithEmbeddings, isGeneratingEmbeddings, processingStep, saveSummariesToDatabase])

  useEffect(() => {
    if (pdfFile) {
      const objectUrl = URL.createObjectURL(pdfFile)
      setPdfUrl(objectUrl)
      setCurrentPdfPage(1)
      return () => URL.revokeObjectURL(objectUrl)
    }
    setPdfUrl(null)
  }, [pdfFile])

  useEffect(() => {
    if (isExtracting) {
      runIdRef.current += 1
      cascadeRunIdRef.current += 1
      setProcessingStep("extracting")
      setProcessingProgress(10)
      setChatEnabled(false)
      setActiveTab("summary")
      setErrorDismissed(false)
      clearEmbeddings()
      clearSummaries()
    }
  }, [isExtracting, clearEmbeddings, clearSummaries])

  useEffect(() => {
    if (extractionError || summaryError || embeddingError) {
      setProcessingStep("error")
      setProcessingProgress(0)
      setErrorDismissed(false)
    }
  }, [extractionError, summaryError, embeddingError])

  // Auto-collapse status bar shortly after completion, auto-show during any active step.
  useEffect(() => {
    if (processingStep === "idle") {
      setStatusVisible(false)
      return
    }
    setStatusVisible(true)
    if (processingStep === "complete") {
      const t = setTimeout(() => setStatusVisible(false), 1800)
      return () => clearTimeout(t)
    }
  }, [processingStep])

  const handleFileSelect = useCallback(
    (file: File) => {
      if (file.type === "application/pdf") {
        setExtractionError("")
        setProcessingStep("extracting")
        setProcessingProgress(5)
        extractTextFromPdf(file)
      } else {
        setExtractionError("Invalid file type. Please select a PDF.")
        setProcessingStep("error")
      }
    },
    [extractTextFromPdf, setExtractionError],
  )

  const handleRegenerateSummary = useCallback(() => {
    if (chunks.length > 0) {
      clearSummaries()
      setProcessingStep("summarizing")
      setProcessingProgress(40)
      generateSummaries(chunks, "openai")
    }
  }, [chunks, clearSummaries, generateSummaries])

  const handleReprocess = useCallback(() => {
    if (!pdfFile) return
    extractTextFromPdf(pdfFile)
  }, [pdfFile, extractTextFromPdf])

  const handleClearDocument = useCallback(() => {
    window.location.reload()
  }, [])

  const processingMessage = (() => {
    switch (processingStep) {
      case "extracting":
        return "Extracting text from PDF…"
      case "chunking":
        return "Creating semantic chunks…"
      case "summarizing":
        return "Generating AI summaries…"
      case "embedding":
        return "Creating vector embeddings…"
      case "saving":
        return "Saving to database…"
      case "complete":
        return "Processing complete. Chat is ready."
      case "error":
        return "Something went wrong during processing."
      default:
        return "Ready"
    }
  })()

  const statusDotClass =
    processingStep === "complete"
      ? "bg-emerald-500"
      : processingStep === "error"
      ? "bg-destructive"
      : processingStep === "idle"
      ? "bg-muted-foreground/30"
      : "bg-amber-500 animate-pulse"

  const firstError = extractionError || summaryError || embeddingError
  const showErrorToast = !!firstError && !errorDismissed

  useEffect(() => {
    if(showErrorToast) {
      toast.error({
        message: firstError || "An unknown error occurred during processing.",
        type: "error",
        autoClose: 5000,
        hideProgressBar: true,
        robotVariant: "angry2",
        theme: "dark"
      })
    }
  }, [firstError])

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky translucent header */}
      <header className="sticky top-0 z-40 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center gap-3 px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">PDF Analyzer</p>
              <p className="text-[10px] text-muted-foreground">
                Summarize · Embed · Chat
              </p>
            </div>
          </div>

          {pdfFile && (
            <DocumentActionsMenu
              disabled={processingStep !== "complete" && processingStep !== "error"}
              onUpload={handleFileSelect}
              onReprocess={handleReprocess}
              onRegenerateSummary={handleRegenerateSummary}
              onClear={handleClearDocument}
              trigger={
                <button
                  className="hidden md:flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs min-w-0 max-w-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                  aria-label="Document actions"
                >
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate max-w-[200px] font-medium">{fileName}</span>
                  {stats && (
                    <span className="text-muted-foreground whitespace-nowrap">
                      · {stats.totalChunks}c · {stats.totalTokens}t
                    </span>
                  )}
                  <span className={cn("ml-1 h-1.5 w-1.5 rounded-full", statusDotClass)} />
                </button>
              }
            />
          )}

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            {pdfFile && (
              <DocumentActionsMenu
                disabled={processingStep !== "complete" && processingStep !== "error"}
                onUpload={handleFileSelect}
                onReprocess={handleReprocess}
                onRegenerateSummary={handleRegenerateSummary}
                onClear={handleClearDocument}
              />
            )}
          </div>
        </div>

        {statusVisible && (
          <div className="border-t bg-muted/30">
            <div className="container mx-auto px-4 py-3">
              <ProcessingStepper
                step={processingStep}
                progress={processingProgress}
                message={processingMessage}
              />
            </div>
          </div>
        )}
      </header>

      <main className="container mx-auto px-4 py-6">
        <div
          className="grid lg:grid-cols-2 gap-6"
          style={{ height: "calc(100vh - 120px)" }}
        >
          <div className="flex flex-col min-h-0">
            {!pdfFile ? (
              <PdfUploadSection
                onFileSelect={handleFileSelect}
                disabled={!pdfJsLoaded || processingStep === "extracting"}
                isLoading={!pdfJsLoaded}
              />
            ) : (
              <PdfViewerSection
                pdfDoc={pdfDoc}
                fileUrl={pdfUrl}
                currentPage={currentPdfPage}
                onPageChange={setCurrentPdfPage}
                fileName={fileName}
              />
            )}
          </div>

          <Card className="flex flex-col min-h-0 overflow-hidden rounded-2xl shadow-sm py-0 gap-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
              <div className="border-b px-4 py-3 bg-background/60 backdrop-blur">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="summary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Summary
                  </TabsTrigger>
                  <TabsTrigger value="chat" disabled={!chatEnabled}>
                    Chat
                    {!chatEnabled && processingStep !== "idle" && (
                      <span className="ml-1 text-[10px] text-muted-foreground">· locked</span>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="summary" className="flex-1 overflow-hidden mt-0 min-h-0">
                <SummaryTab
                  chunks={chunks}
                  summaries={summaries}
                  finalSummary={finalSummary}
                  isGenerating={isGeneratingSummaries}
                  error={summaryError}
                  stats={summaryStats}
                  requiresApiKey={summaryRequiresApiKey}
                  processingStep={processingStep}
                  onRegenerateSummary={handleRegenerateSummary}
                />
              </TabsContent>

              <TabsContent value="chat" className="flex-1 overflow-hidden mt-0 min-h-0">
                <ChatTab enabled={chatEnabled} chunks={chunksWithEmbeddings} />
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </main>
    </div>
  )
}
