"use client"

import { useState, useEffect, useCallback } from "react"

import { usePdfExtractor } from "@/hooks/use-pdf-extractor"
import { useTextChunker } from "@/hooks/use-text-chunker"
import { useEmbeddings } from "@/hooks/use-embeddings"
import { useSummarization } from "@/hooks/use-summarization"

import { PdfUploadSection } from "@/components/pdf-upload-section"
import { PdfViewerSection } from "@/components/pdf-viewer-section"
import { SummaryTab } from "@/components/summary-tab"
import { ChatTab } from "@/components/chat-tab"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"

import { Loader2, MessageSquare, Sparkles, CheckCircle, AlertCircle } from "lucide-react"

type ProcessingStep = "idle" | "extracting" | "chunking" | "summarizing" | "embedding" | "saving" | "complete" | "error"

export default function PDFAnalyzerPage() {
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

  // Text chunking
  const { chunks, stats, isChunking, chunkText } = useTextChunker()

  // Embeddings
  const {
    chunksWithEmbeddings,
    isGenerating: isGeneratingEmbeddings,
    error: embeddingError,
    generateEmbeddings,
    clearEmbeddings,
  } = useEmbeddings()

  // Summarization - using OpenAI by default
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

  // UI state
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [currentPdfPage, setCurrentPdfPage] = useState<number>(1)
  const [processingStep, setProcessingStep] = useState<ProcessingStep>("idle")
  const [processingProgress, setProcessingProgress] = useState(0)
  const [chatEnabled, setChatEnabled] = useState(false)
  const [activeTab, setActiveTab] = useState("summary")

  // Auto-process when PDF is uploaded
  useEffect(() => {
    if (extractedText && fileName && pdfDoc && processingStep === "extracting") {
      setProcessingStep("chunking")
      setProcessingProgress(25)
      chunkText(extractedText, fileName, pdfDoc.numPages)
    }
  }, [extractedText, fileName, pdfDoc, chunkText, processingStep])

  // Auto-generate summaries when chunks are ready
  useEffect(() => {
    if (chunks.length > 0 && processingStep === "chunking" && !isChunking) {
      setProcessingStep("summarizing")
      setProcessingProgress(40)
      generateSummaries(chunks, "openai") // Always use OpenAI for speed
    }
  }, [chunks, isChunking, processingStep, generateSummaries])

  // Auto-generate embeddings when summaries are ready
  useEffect(() => {
    if ((summaries.length > 0 || finalSummary) && processingStep === "summarizing" && !isGeneratingSummaries) {
      setProcessingStep("embedding")
      setProcessingProgress(60)
      generateEmbeddings(chunks)
    }
  }, [summaries, finalSummary, isGeneratingSummaries, processingStep, generateEmbeddings, chunks])

  // Auto-save to database when embeddings are ready
  useEffect(() => {
    if (chunksWithEmbeddings.length > 0 && processingStep === "embedding" && !isGeneratingEmbeddings) {
      setProcessingStep("saving")
      setProcessingProgress(80)
      saveSummariesToDatabase()
    }
  }, [chunksWithEmbeddings, isGeneratingEmbeddings, processingStep])

  // Handle PDF file changes
  useEffect(() => {
    if (pdfFile) {
      const objectUrl = URL.createObjectURL(pdfFile)
      setPdfUrl(objectUrl)
      setCurrentPdfPage(1)
      return () => URL.revokeObjectURL(objectUrl)
    }
    setPdfUrl(null)
  }, [pdfFile])

  // Reset processing when new PDF is uploaded
  useEffect(() => {
    if (isExtracting) {
      setProcessingStep("extracting")
      setProcessingProgress(10)
      setChatEnabled(false)
      setActiveTab("summary")
      clearEmbeddings()
      clearSummaries()
    }
  }, [isExtracting, clearEmbeddings, clearSummaries])

  // Handle errors
  useEffect(() => {
    if (extractionError || summaryError || embeddingError) {
      setProcessingStep("error")
      setProcessingProgress(0)
    }
  }, [extractionError, summaryError, embeddingError])

  const saveSummariesToDatabase = async () => {
    if (!summaries.length && !finalSummary) return

    try {
      const response = await fetch("/api/v4/save_summaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summaries,
          finalSummary,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save summaries to database")
      }

      const data = await response.json()
      console.log("✅ Summaries saved to database:", data)

      setProcessingStep("complete")
      setProcessingProgress(100)
      setChatEnabled(true)
    } catch (error) {
      console.error("❌ Error saving summaries:", error)
      setProcessingStep("error")
    }
  }

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

  const handleRegenerateSummary = () => {
    if (chunks.length > 0) {
      clearSummaries()
      setProcessingStep("summarizing")
      setProcessingProgress(40)
      generateSummaries(chunks, "openai")
    }
  }

  const getProcessingMessage = () => {
    switch (processingStep) {
      case "extracting":
        return "Extracting text from PDF..."
      case "chunking":
        return "Creating semantic chunks..."
      case "summarizing":
        return "Generating AI summaries with OpenAI GPT-4o-mini..."
      case "embedding":
        return "Creating vector embeddings for chat..."
      case "saving":
        return "Saving to database..."
      case "complete":
        return "Processing complete! Chat is now enabled."
      case "error":
        return "An error occurred during processing."
      default:
        return "Ready to process PDF"
    }
  }

  const getProcessingIcon = () => {
    switch (processingStep) {
      case "complete":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <Loader2 className="h-5 w-5 animate-spin" />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">PDF Analyzer</h1>
              <p className="text-sm text-muted-foreground">
                Upload PDFs, generate summaries, and chat with your documents using AI
              </p>
            </div>
            {fileName && (
              <div className="text-right">
                <p className="text-sm font-medium">{fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {stats ? `${stats.totalChunks} chunks, ${stats.totalTokens} tokens` : "Processing..."}
                </p>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Processing Status */}
      {processingStep !== "idle" && (
        <div className="border-b bg-gray-50 dark:bg-gray-800">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              {getProcessingIcon()}
              <div className="flex-1">
                <p className="text-sm font-medium">{getProcessingMessage()}</p>
                <Progress value={processingProgress} className="mt-2 h-2" />
              </div>
              <div className="text-sm text-muted-foreground">{processingProgress}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-2 gap-6" style={{ height: "calc(100vh - 200px)" }}>
          {/* Left Side - PDF Upload/Viewer */}
          <div className="flex flex-col">
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

          {/* Right Side - Tabs */}
          <Card className="flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
              <div className="border-b px-6 pt-6 pb-0">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="summary" className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Summary
                  </TabsTrigger>
                  <TabsTrigger value="chat" disabled={!chatEnabled} className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Chat {!chatEnabled && "(Processing...)"}
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="summary" className="flex-1 overflow-hidden mt-0">
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

              <TabsContent value="chat" className="flex-1 overflow-hidden mt-0">
                <ChatTab
                  enabled={chatEnabled}
                  chunks={chunksWithEmbeddings}
                />
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </main>

      {/* Error Alerts */}
      {(extractionError || summaryError || embeddingError) && (
        <Alert variant="destructive" className="fixed bottom-4 right-4 w-auto max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{extractionError || summaryError || embeddingError}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
