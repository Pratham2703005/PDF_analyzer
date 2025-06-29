"use client"

import { useState, useCallback, useEffect } from "react"
import type { TextItem } from "@/lib/types"
import type { PDFDocumentProxy as PDFType} from "@/lib/types"

import type * as PDFJS from "pdfjs-dist"

const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
const PDFJS_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
const CMAP_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/"

export function usePdfExtractor() {
  const [pdfJsLoaded, setPdfJsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [fileName, setFileName] = useState("")
  const [extractedText, setExtractedText] = useState("")
  const [pdfDoc, setPdfDoc] = useState<PDFType | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const loadPdfJs = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        const globalWindow = window as typeof window & { pdfjsLib?: typeof PDFJS }
        if (globalWindow.pdfjsLib) {
          globalWindow.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL
          setPdfJsLoaded(true)
          resolve()
          return
        }
        const script = document.createElement("script")
        script.src = PDFJS_URL
        script.async = true
        script.onload = () => {
          if (globalWindow.pdfjsLib) {
            globalWindow.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL
            setPdfJsLoaded(true)
            resolve()
          } else {
            reject(new Error("PDF.js failed to load"))
          }
        }
        script.onerror = () => reject(new Error("Failed to load PDF.js script"))
        document.head.appendChild(script)
      })
    }
    loadPdfJs().catch((err) => setError(`Critical error: ${err.message}. Please refresh.`))
  }, [])

  const extractTextFromPdf = useCallback(
    async (file: File) => {
      const globalWindow = window as typeof window & { pdfjsLib?: typeof PDFJS }
      if (!pdfJsLoaded || !globalWindow.pdfjsLib) {
        setError("PDF.js is not ready.")
        return
      }

      setIsLoading(true)
      setError("")
      setExtractedText("")
      setFileName(file.name)
      setPdfFile(file)

      try {
        if (pdfDoc) {
          await pdfDoc.destroy()
          setPdfDoc(null)
        }

        const arrayBuffer = await file.arrayBuffer()
        const loadingTask = globalWindow.pdfjsLib.getDocument({
          data: arrayBuffer,
          cMapUrl: CMAP_URL,
          cMapPacked: true,
        })
        const loadedPdfDoc = (await loadingTask.promise) as PDFType
        setPdfDoc(loadedPdfDoc)

        let fullText = ""
        for (let i = 1; i <= loadedPdfDoc.numPages; i++) {
          const page = await loadedPdfDoc.getPage(i)
          const content = await page.getTextContent()
          const text = content.items.map((item) => (item as TextItem).str).join("\n")
          fullText += text + "\n\n"
        }

        fullText = fullText.trim().replace(/(\n\s*){3,}/g, "\n\n")
        setExtractedText(fullText)

        if (!fullText) {
          setError("No text found in PDF.")
        }
      } catch (err) {
        if (err instanceof Error) setError(`Failed to process PDF: ${err.message}`)
        else setError("Unknown error occurred during PDF processing.")
        if (pdfDoc) {
          await pdfDoc.destroy()
          setPdfDoc(null)
        }
        setPdfFile(null)
      } finally {
        setIsLoading(false)
      }
    },
    [pdfJsLoaded, pdfDoc],
  )

  return {
    pdfJsLoaded,
    isLoading,
    error,
    fileName,
    extractedText,
    pdfDoc,
    pdfFile,
    extractTextFromPdf,
    setError,
  }
}
