"use client"

import { useState, useCallback } from "react"
import type { TextChunk } from "@/lib/types"
import type { SummaryChunk, SummarizationStats, SummarizationModel } from "@/lib/services/summarization-service"

export function useSummarization() {
  const [summaries, setSummaries] = useState<SummaryChunk[]>([])
  const [finalSummary, setFinalSummary] = useState<SummaryChunk | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState("")
  const [requiresApiKey, setRequiresApiKey] = useState(false)
  const [stats, setStats] = useState<SummarizationStats | null>(null)
  const [selectedModel, setSelectedModel] = useState<SummarizationModel>("openai")

  const generateSummaries = useCallback(
    async (chunks: TextChunk[], model?: SummarizationModel) => {
      const modelToUse = model || selectedModel

      if (chunks.length === 0) {
        setSummaries([])
        setFinalSummary(null)
        setStats(null)
        return
      }

      setIsGenerating(true)
      setError("")
      setRequiresApiKey(false)
      setSummaries([])
      setFinalSummary(null)
      setStats(null)

      try {
        console.log(`🚀 Starting summarization of ${chunks.length} chunks with ${modelToUse} model`)

        const response = await fetch("/api/v4/summarize_chunks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chunks,
            model: modelToUse,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          if (data.requiresApiKey) {
            setRequiresApiKey(true)
          }
          throw new Error(data.message || "Failed to generate summaries")
        }

        if (!data.success) {
          if (data.requiresApiKey) {
            setRequiresApiKey(true)
          }
          throw new Error(data.message || "Failed to generate summaries")
        }

        console.log(`✅ Summarization completed:`, data.stats)

        setSummaries(data.summaries || [])
        setFinalSummary(data.finalSummary || null)
        setStats(data.stats || null)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to generate summaries"
        setError(errorMessage)
        setSummaries([])
        setFinalSummary(null)
        setStats(null)
        console.error("❌ Summarization error:", err)
      } finally {
        setIsGenerating(false)
      }
    },
    [selectedModel],
  )

  const clearSummaries = useCallback(() => {
    setSummaries([])
    setFinalSummary(null)
    setError("")
    setRequiresApiKey(false)
    setStats(null)
  }, [])

  return {
    summaries,
    finalSummary,
    isGenerating,
    error,
    requiresApiKey,
    stats,
    selectedModel,
    setSelectedModel,
    generateSummaries,
    clearSummaries,
  }
}
