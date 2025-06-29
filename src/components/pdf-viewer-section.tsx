"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          PDF Document
        </CardTitle>
        <CardDescription>
          {fileName} • {pdfDoc?.numPages || 0} pages
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <PdfViewer pdfDoc={pdfDoc} fileUrl={fileUrl} currentPage={currentPage} onPageChange={onPageChange} />
      </CardContent>
    </Card>
  )
}
