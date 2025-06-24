"use client"

import { useState, useEffect, useCallback, type JSX } from "react"
import { usePdfExtractor } from "@/hooks/use-pdf-extractor"
import { useTextChunker } from "@/hooks/use-text-chunker"
import { useEmbeddings } from "@/hooks/use-embeddings"
import { PdfUploadForm } from "@/components/pdf-upload-form"
import { PdfViewer } from "@/components/pdf-viewer"
import { ResultsPanel } from "@/components/results-panel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, FileText, UploadCloud, CopyCheck, FolderOpen } from "lucide-react"
import { copyToClipboard } from "@/lib/utils"
import type { TextChunk } from "@/lib/types"

export default function PDFAnalyzerPage(): JSX.Element {
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
    cacheInfo: embeddingCacheInfo,
    generateEmbeddings,
    clearEmbeddings,
  } = useEmbeddings()

  // UI state
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [currentPdfPage, setCurrentPdfPage] = useState<number>(1)
  const [highlightInPdf, setHighlightInPdf] = useState<number | null>(null)
  const [copySuccessMessage, setCopySuccessMessage] = useState<string>("")

  // Auto-chunk when text is extracted
  useEffect(() => {
    if (extractedText && fileName && pdfDoc) {
      chunkText(extractedText, fileName, pdfDoc.numPages)
    }
  }, [extractedText, fileName, pdfDoc, chunkText])

  // Clear embeddings when new PDF is processed
  useEffect(() => {
    if (extractedText) {
      clearEmbeddings()
    }
  }, [extractedText, clearEmbeddings])

  useEffect(() => {
    if (pdfFile) {
      const objectUrl = URL.createObjectURL(pdfFile)
      setPdfUrl(objectUrl)
      setCurrentPdfPage(1)
      return () => URL.revokeObjectURL(objectUrl)
    }
    setPdfUrl(null)
  }, [pdfFile])

  const handleFileSelect = useCallback(
    (file: File) => {
      if (file.type === "application/pdf") {
        setExtractionError("")
        extractTextFromPdf(file)
      } else {
        setExtractionError("Invalid file type. Please select a PDF.")
      }
    },
    [extractTextFromPdf, setExtractionError],
  )

  const handleChunkClick = useCallback((chunk: TextChunk) => {
    setHighlightInPdf(chunk.pageNumber)
  }, [])

  const handleCopyToClipboard = async (text: string) => {
    const success = await copyToClipboard(text)
    if (success) {
      setCopySuccessMessage("Copied to clipboard!")
      setTimeout(() => setCopySuccessMessage(""), 2000)
    } else {
      setCopySuccessMessage("Failed to copy.")
      setTimeout(() => setCopySuccessMessage(""), 2000)
    }
  }

  const isProcessing = isExtracting || isChunking

const [showSuccess, setShowSuccess] = useState(false)

useEffect(() => {
  if (fileName && !isProcessing && !extractionError && extractedText) {
    setShowSuccess(true)
    const timer = setTimeout(() => setShowSuccess(false), 5000)
    return () => clearTimeout(timer)
  }
}, [fileName, isProcessing, extractionError, extractedText])

  return (
    <div className="min-h-screen bg-background text-foreground p-4 lg:p-6">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold mb-2">PDF Analyzer</h1>
        <p className="text-muted-foreground">
          Upload PDFs, extract text, generate semantic chunks, and create vector embeddings for analysis.
        </p>
        {!pdfJsLoaded && !extractionError && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-2 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading PDF processing library...
          </p>
        )}
      </header>

      <main className="grid lg:grid-cols-2 gap-6" style={{ height: "calc(100vh - 150px)" }}>
        {/* Left Panel: Upload and PDF Exploration */}
        <div className="flex flex-col gap-4">
          {/* Upload Section */}
          <Card className="flex-shrink-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5" /> Upload PDF
              </CardTitle>
              <CardDescription>Select or drag and drop your PDF files here.</CardDescription>
            </CardHeader>
            <CardContent>
              <PdfUploadForm onFileSelect={handleFileSelect} disabled={!pdfJsLoaded || isProcessing} />
            </CardContent>
          </Card>

          {/* PDF Exploration Section */}
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5" /> Explore PDF
              </CardTitle>
              <CardDescription>
                {fileName ? `Viewing: ${fileName}` : "PDF viewer will appear here after upload."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0">
                <PdfViewer
                  pdfDoc={pdfDoc}
                  fileUrl={pdfUrl}
                  currentPage={currentPdfPage}
                  onPageChange={setCurrentPdfPage}
                  highlightPage={highlightInPdf}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Results */}
        <ResultsPanel
          chunks={chunks}
          stats={stats}
          rawText={extractedText}
          chunksWithEmbeddings={chunksWithEmbeddings}
          isLoading={isExtracting}
          isChunking={isChunking}
          isGeneratingEmbeddings={isGeneratingEmbeddings}
          embeddingError={embeddingError}
          embeddingCacheInfo={embeddingCacheInfo}
          onCopy={handleCopyToClipboard}
          onChunkClick={handleChunkClick}
          onGenerateEmbeddings={generateEmbeddings}
          onClearEmbeddings={clearEmbeddings}
        />
      </main>

      {/* Error Alerts */}
      {extractionError && (
        <Alert variant="destructive" className="fixed bottom-4 right-4 w-auto max-w-md">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{extractionError}</AlertDescription>
        </Alert>
      )}

      {/* Success Messages */}
      {copySuccessMessage && (
        <Alert className="fixed bottom-4 left-4 w-auto bg-green-100 dark:bg-green-800 border-green-300 dark:border-green-600 text-green-700 dark:text-green-200">
          <CopyCheck className="h-5 w-5 text-green-600 dark:text-green-300" />
          <AlertDescription>{copySuccessMessage}</AlertDescription>
        </Alert>
      )}

      {showSuccess && (
        <Alert className="fixed bottom-16 right-4 w-auto max-w-md bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700">
          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-300" />
          <AlertDescription className="text-blue-700 dark:text-blue-200">
            Successfully processed: <strong>{fileName}</strong>.
            {stats && `Found ${stats.totalChunks} chunks, ${stats.totalTokens} tokens.`}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
