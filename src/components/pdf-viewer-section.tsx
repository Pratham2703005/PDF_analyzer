"use client"

import { Card } from "@/components/ui/card"
import { PdfViewer } from "./pdf-viewer"
import { FileText } from "lucide-react"
import type { PDFDocumentProxy } from "@/lib/types"

interface PdfViewerSectionProps {
  pdfDoc: PDFDocumentProxy | null
  fileUrl: string | null
  currentPage: number
  onPageChange: (page: number) => void
  fileName: string
}

export function PdfViewerSection({ pdfDoc, fileUrl, currentPage, onPageChange, fileName }: PdfViewerSectionProps) {
  return (
    <Card className="h-full flex flex-col overflow-hidden rounded-2xl shadow-sm py-0 gap-0">
      <div className="flex items-center gap-3 border-b px-5 py-3 bg-background/60 backdrop-blur">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileText className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{fileName}</p>
          <p className="text-xs text-muted-foreground">{pdfDoc?.numPages || 0} pages</p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden bg-muted/20">
        <PdfViewer pdfDoc={pdfDoc} fileUrl={fileUrl} currentPage={currentPage} onPageChange={onPageChange} />
      </div>
    </Card>
  )
}
