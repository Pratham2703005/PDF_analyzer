"use client"

import type React from "react"

import { useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, FileText, Loader2 } from "lucide-react"

interface PdfUploadSectionProps {
  onFileSelect: (file: File) => void
  disabled: boolean
  isLoading: boolean
}

export function PdfUploadSection({ onFileSelect, disabled, isLoading }: PdfUploadSectionProps) {
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
      }
    },
    [onFileSelect, disabled],
  )

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Upload PDF Document
        </CardTitle>
        <CardDescription>Select a PDF file to analyze, summarize, and chat with its content</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center">
        <div className="space-y-6">
          <div>
            <Label htmlFor="pdf-upload">Choose PDF File</Label>
            <Input
              id="pdf-upload"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="mt-2"
              disabled={disabled}
            />
          </div>

          <div className="text-center text-muted-foreground">or</div>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              disabled
                ? "border-gray-200 dark:border-gray-700 cursor-not-allowed bg-gray-50 dark:bg-gray-800"
                : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-gray-400" />
            ) : (
              <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            )}
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {isLoading ? "Loading PDF processor..." : "Drag and drop your PDF here"}
              </p>
              <p className="text-sm text-muted-foreground">Supports PDF files up to 50MB</p>
              <p className="text-xs text-muted-foreground">
                Your document will be processed automatically: Extract → Summarize → Embed → Chat
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
