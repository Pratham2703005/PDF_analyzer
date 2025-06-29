"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { PDFDocumentProxy, PDFPageProxy, PDFPageViewport } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface PdfViewerProps {
  pdfDoc: PDFDocumentProxy | null
  fileUrl: string | null
  currentPage: number
  onPageChange: (page: number) => void
  highlightPage?: number | null
}

export function PdfViewer({ pdfDoc, fileUrl, currentPage, onPageChange, highlightPage }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const [numPages, setNumPages] = useState(0)
  const [scale, setScale] = useState(1.0)
  const [renderedPage, setRenderedPage] = useState(0)

  useEffect(() => {
    if (pdfDoc) {
      setNumPages(pdfDoc.numPages)
      if (currentPage > pdfDoc.numPages || currentPage < 1) onPageChange(1)
    } else {
      setNumPages(0)
    }
  }, [pdfDoc, currentPage, onPageChange])

  const renderPage = useCallback(
    async (pageNumber: number) => {
      if (!pdfDoc || !canvasRef.current || !containerRef.current) return
      try {
        const page: PDFPageProxy = await pdfDoc.getPage(pageNumber)
        const containerWidth = containerRef.current.clientWidth
        const unscaledViewport = page.getViewport({ scale: 1 })
        const scaleFactor = containerWidth / unscaledViewport.width
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        canvas.height = viewport.height
        canvas.width = viewport.width
        await page.render({ canvasContext: ctx, viewport }).promise
        setRenderedPage(pageNumber)
      } catch (e) {
        console.error("Error rendering page:", e)
      }
    },
    [pdfDoc, scale],
  )

  useEffect(() => {
    if (pdfDoc && currentPage !== renderedPage && currentPage > 0 && currentPage <= numPages) renderPage(currentPage)
  }, [pdfDoc, currentPage, numPages, renderPage, renderedPage])

  useEffect(() => {
    if (highlightPage && highlightPage !== currentPage && highlightPage > 0 && highlightPage <= numPages) {
      onPageChange(highlightPage)
      scrollAreaRef.current?.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [highlightPage, currentPage, numPages, onPageChange])

  const handlePrev = () => currentPage > 1 && onPageChange(currentPage - 1)
  const handleNext = () => currentPage < numPages && onPageChange(currentPage + 1)

  if (!fileUrl || !pdfDoc) {
    return (
      <div className="flex items-center justify-center h-full border rounded bg-gray-50 dark:bg-gray-800">
        <p className="text-gray-500 dark:text-gray-400">PDF will be displayed here once uploaded.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b bg-gray-100 dark:bg-gray-900 rounded-t-md">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handlePrev} disabled={currentPage <= 1}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span>
            Page {currentPage} of {numPages}
          </span>
          <Button variant="ghost" size="icon" onClick={handleNext} disabled={currentPage >= numPages}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setScale((s) => Math.max(s - 0.1, 0.5))}>
            <ZoomOut className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setScale((s) => Math.min(s + 0.1, 2.5))}>
            <ZoomIn className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setScale(1)}>
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Viewer */}
      <ScrollArea className="flex-1 bg-gray-200 dark:bg-gray-700 p-4" ref={scrollAreaRef}>
        <div className="flex justify-center items-start" ref={containerRef}>
          <canvas ref={canvasRef} className="shadow-lg rounded max-w-full h-auto" />
        </div>
      </ScrollArea>
    </div>
  )
}
