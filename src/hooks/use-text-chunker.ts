"use client"

import { useState, useCallback } from "react"
import { encode } from "gpt-tokenizer"
import type { TextChunk, ChunkingStats } from "@/lib/types"

function splitByHeadings(text: string, fileName: string): { heading: string; content: string }[] {
  const pattern = /^(\d+\.\s+.*)/gm
  const sections = []
  const matches = Array.from(text.matchAll(pattern))

  if (matches.length > 0 && matches[0].index! > 0) {
    const content = text.slice(0, matches[0].index!).trim()
    if (content) sections.push({ heading: fileName, content })
  }

  for (let i = 0; i < matches.length; i++) {
    const heading = matches[i][1].trim()
    const startIndex = matches[i].index! + matches[i][0].length
    const endIndex = i + 1 < matches.length ? matches[i + 1].index! : text.length
    const content = text.slice(startIndex, endIndex).trim()
    if (content) sections.push({ heading, content })
  }

  if (sections.length === 0 && text.trim()) {
    sections.push({ heading: fileName, content: text.trim() })
  }
  return sections
}

export function useTextChunker() {
  const [chunks, setChunks] = useState<TextChunk[]>([])
  const [stats, setStats] = useState<ChunkingStats | null>(null)
  const [isChunking, setIsChunking] = useState(false)

  const chunkText = useCallback(async (textToChunk: string, fileName: string, totalPages = 0) => {
    if (!textToChunk) {
      setChunks([])
      setStats(null)
      return
    }

    setIsChunking(true)

    try {
      const MAX_TOKENS_PER_CHUNK = 300
      const allChunks: TextChunk[] = []
      let chunkCounter = 0
      const pageTracker: { [key: string]: number } = {}

      const createChunk = (text: string, title: string, level: number, pageNum = 1): TextChunk => {
        const trimmedText = text.trim()
        const chunkId = `chunk-${++chunkCounter}`

        // Track page distribution
        if (!pageTracker[pageNum]) pageTracker[pageNum] = 0
        pageTracker[pageNum]++

        return {
          id: chunkId,
          text: trimmedText,
          pageNumber: pageNum,
          title,
          level,
          tokenCount: encode(trimmedText).length,
          wordCount: trimmedText.split(/\s+/).length,
        }
      }

      const groupSubsections = (units: string[], title: string, level: number, pageNum = 1): TextChunk[] => {
        const groupedChunks: TextChunk[] = []
        let currentChunkText = ""
        for (const unit of units) {
          const newChunk = currentChunkText ? currentChunkText + "\n\n" + unit : unit
          if (encode(newChunk).length > MAX_TOKENS_PER_CHUNK) {
            if (currentChunkText) groupedChunks.push(createChunk(currentChunkText, title, level, pageNum))
            currentChunkText = unit
          } else {
            currentChunkText = newChunk
          }
        }
        if (currentChunkText) groupedChunks.push(createChunk(currentChunkText, title, level, pageNum))
        return groupedChunks
      }

      const sections = splitByHeadings(textToChunk, fileName)
      let currentPage = 1

      for (const section of sections) {
        // Estimate page number based on text position
        const sectionPosition = textToChunk.indexOf(section.content)
        const estimatedPage = Math.max(1, Math.ceil((sectionPosition / textToChunk.length) * totalPages))
        currentPage = estimatedPage

        if (encode(section.content).length <= MAX_TOKENS_PER_CHUNK) {
          allChunks.push(createChunk(section.content, section.heading, 1, currentPage))
          continue
        }

        const paragraphs = section.content.split(/\n\s*\n/).filter((p) => p.trim())
        const paragraphChunks = groupSubsections(paragraphs, section.heading, 2, currentPage)

        for (const pChunk of paragraphChunks) {
          if (pChunk.tokenCount <= MAX_TOKENS_PER_CHUNK) {
            allChunks.push(pChunk)
            continue
          }

          const sentences = pChunk.text.split(/(?<=[.!?])\s+/g).filter((s) => s.trim())
          const sentenceChunks = groupSubsections(sentences, pChunk.title, 3, pChunk.pageNumber)

          for (const sChunk of sentenceChunks) {
            if (sChunk.tokenCount <= MAX_TOKENS_PER_CHUNK) {
              allChunks.push(sChunk)
              continue
            }

            const words = sChunk.text.split(/\s+/)
            let currentText = ""
            let part = 1
            for (const word of words) {
              const newText = currentText ? currentText + " " + word : word
              if (encode(newText).length > MAX_TOKENS_PER_CHUNK) {
                allChunks.push(createChunk(currentText, `${sChunk.title}.${part}`, 4, sChunk.pageNumber))
                currentText = word
                part++
              } else {
                currentText = newText
              }
            }
            if (currentText) {
              allChunks.push(createChunk(currentText, `${sChunk.title}.${part}`, 4, sChunk.pageNumber))
            }
          }
        }
      }

      setChunks(allChunks)

      if (allChunks.length > 0) {
        const totalChars = allChunks.reduce((sum, c) => sum + c.text.length, 0)
        const totalTokens = allChunks.reduce((sum, c) => sum + c.tokenCount, 0)

        // Calculate level distribution
        const chunksByLevel: { [key: number]: number } = {}
        allChunks.forEach((chunk) => {
          chunksByLevel[chunk.level] = (chunksByLevel[chunk.level] || 0) + 1
        })

        // Calculate page distribution
        const chunksByPage: { [key: number]: number } = {}
        allChunks.forEach((chunk) => {
          chunksByPage[chunk.pageNumber] = (chunksByPage[chunk.pageNumber] || 0) + 1
        })

        setStats({
          totalChunks: allChunks.length,
          totalTokens,
          averageChunkSize: totalChars / allChunks.length,
          chunksByLevel,
          chunksByPage,
        })
      } else {
        setStats(null)
      }
    } catch (e) {
      console.error("Failed to chunk text:", e)
      setChunks([])
      setStats(null)
    } finally {
      setIsChunking(false)
    }
  }, [])

  return { chunks, stats, isChunking, chunkText, setChunks, setStats }
}
