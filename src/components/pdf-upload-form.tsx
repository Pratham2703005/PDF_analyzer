"use client"

import { useCallback, useEffect, useState } from "react"
import type React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload } from "lucide-react"

interface PdfUploadFormProps {
  onFileSelect: (file: File) => void
  disabled: boolean
}

export function PdfUploadForm({ onFileSelect, disabled }: PdfUploadFormProps) {
  const [pdfReady, setPdfReady] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).pdfjsLib) {
      setPdfReady(true)
    }
  }, [])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0]
    if (file) onFileSelect(file)
  }

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>): void => {
      event.preventDefault()
      event.stopPropagation()
      if (disabled) return
      const file = event.dataTransfer.files[0]
      if (file && file.type === "application/pdf") {
        onFileSelect(file)
      } else if (file) {
        console.warn("Invalid file type dropped. Only PDF is allowed.")
      }
    },
    [onFileSelect, disabled],
  )

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="pdf-upload">Choose PDF File</Label>
        <Input
          id="pdf-upload"
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="mt-1"
          disabled={disabled}
        />
      </div>

      <div className="text-center text-gray-500 dark:text-gray-400">or</div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          disabled
            ? "border-gray-200 dark:border-gray-700 cursor-not-allowed bg-gray-50 dark:bg-gray-800"
            : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50"
        }`}
      >
        <Upload
          className={`w-12 h-12 mx-auto mb-4 ${
            disabled ? "text-gray-300 dark:text-gray-500" : "text-gray-400 dark:text-gray-400"
          }`}
        />
        <p className={`mb-2 ${disabled ? "text-gray-400 dark:text-gray-500" : "text-gray-600 dark:text-gray-300"}`}>
          {disabled && !pdfReady ? "Loading PDF processor..." : "Drag and drop your PDF file here"}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">Supports PDF files only</p>
      </div>
    </div>
  )
}
