"use client"

import { useState, useCallback } from "react"
import type { TextChunk } from "@/lib/types"

export interface CacheInfo {
  fromCache: number
  newlyGenerated: number
}

export interface BatchInfo {
  totalBatches: number
  batchSize: number
  processingTime: number
}

export function useEmbeddings() {
  const [chunksWithEmbeddings, setChunksWithEmbeddings] = useState<TextChunk[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState("")
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null)
  const [batchInfo, setBatchInfo] = useState<BatchInfo | null>(null)

  const generateEmbeddings = useCallback(async (chunks: TextChunk[]) => {
    if (chunks.length === 0) {
      setChunksWithEmbeddings([])
      setCacheInfo(null)
      setBatchInfo(null)
      return
    }

    setIsGenerating(true)
    setError("")
    setBatchInfo(null)

    try {
      const response = await fetch("/api/v4/generate_embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chunks }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || "Failed to generate embeddings")
      }

      setChunksWithEmbeddings(data.chunks)
      setCacheInfo({
        fromCache: data.fromCache || 0,
        newlyGenerated: data.newlyGenerated || 0,
      })

      if (data.batchInfo) {
        setBatchInfo(data.batchInfo)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate embeddings"
      setError(errorMessage)
      setChunksWithEmbeddings([])
      setCacheInfo(null)
      setBatchInfo(null)
      console.error("Embedding generation error:", err)
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const clearEmbeddings = useCallback(() => {
    setChunksWithEmbeddings([])
    setError("")
    setCacheInfo(null)
    setBatchInfo(null)
  }, [])
  
  return {
    chunksWithEmbeddings,
    isGenerating,
    error,
    cacheInfo,
    batchInfo,
    generateEmbeddings,
    clearEmbeddings,
  }
}
