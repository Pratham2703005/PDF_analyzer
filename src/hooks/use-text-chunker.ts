"use client"

import { useState, useCallback } from "react"
import { encode } from "gpt-tokenizer"
import type { Block, TextChunk, ChunkingStats } from "@/lib/types"

const MAX_TOKENS_PER_CHUNK = 800

function tokenCount(text: string): number {
  return encode(text).length
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function makeChunk(
  id: number,
  text: string,
  pageNumber: number,
  title: string,
  level: number,
): TextChunk {
  const trimmed = text.trim()
  return {
    id: `chunk-${id}`,
    text: trimmed,
    pageNumber,
    title,
    level,
    tokenCount: tokenCount(trimmed),
    wordCount: wordCount(trimmed),
  }
}

function packParagraphs(
  paragraphs: { text: string; page: number }[],
  startId: number,
  title: string,
  level: number,
): TextChunk[] {
  if (paragraphs.length === 0) return []
  const out: TextChunk[] = []
  let buf: { text: string; page: number }[] = []
  let bufTokens = 0
  let counter = startId

  const flushBuf = () => {
    if (buf.length === 0) return
    const text = buf.map((p) => p.text).join("\n\n")
    out.push(makeChunk(++counter, text, buf[0].page, title, level))
    buf = []
    bufTokens = 0
  }

  for (const para of paragraphs) {
    const t = tokenCount(para.text)
    if (t > MAX_TOKENS_PER_CHUNK) {
      flushBuf()
      out.push(makeChunk(++counter, para.text, para.page, title, level))
      continue
    }
    if (bufTokens + t > MAX_TOKENS_PER_CHUNK && buf.length > 0) {
      flushBuf()
    }
    buf.push(para)
    bufTokens += t
  }
  flushBuf()
  return out
}

function chunkFromBlocks(blocks: Block[], fileName: string): TextChunk[] {
  const all: TextChunk[] = []
  let currentTitle = fileName
  let currentLevel = 0
  let buffer: { text: string; page: number }[] = []

  const flush = () => {
    const packed = packParagraphs(buffer, all.length, currentTitle, currentLevel)
    all.push(...packed)
    buffer = []
  }

  for (const block of blocks) {
    if (block.type === "heading") {
      flush()
      currentTitle = block.text
      currentLevel = block.level ?? 1
    } else {
      buffer.push({ text: block.text, page: block.page })
    }
  }
  flush()
  return all
}

function chunkFromFlatText(text: string, fileName: string, totalPages: number): TextChunk[] {
  if (!text.trim()) return []
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p, _, arr) => {
      const idx = text.indexOf(p)
      const page = totalPages > 0
        ? Math.max(1, Math.ceil(((idx + 1) / text.length) * totalPages))
        : 1
      return { text: p, page }
    })
  return packParagraphs(paragraphs, 0, fileName, 0)
}

export function useTextChunker() {
  const [chunks, setChunks] = useState<TextChunk[]>([])
  const [stats, setStats] = useState<ChunkingStats | null>(null)
  const [isChunking, setIsChunking] = useState(false)

  const computeStats = useCallback((all: TextChunk[]): ChunkingStats | null => {
    if (all.length === 0) return null
    const totalChars = all.reduce((s, c) => s + c.text.length, 0)
    const totalTokens = all.reduce((s, c) => s + c.tokenCount, 0)
    const chunksByLevel: { [key: number]: number } = {}
    const chunksByPage: { [key: number]: number } = {}
    for (const c of all) {
      chunksByLevel[c.level] = (chunksByLevel[c.level] || 0) + 1
      chunksByPage[c.pageNumber] = (chunksByPage[c.pageNumber] || 0) + 1
    }
    return {
      totalChunks: all.length,
      totalTokens,
      averageChunkSize: totalChars / all.length,
      chunksByLevel,
      chunksByPage,
    }
  }, [])

  const chunkBlocks = useCallback(
    async (blocks: Block[], fileName: string) => {
      setIsChunking(true)
      try {
        const all = chunkFromBlocks(blocks, fileName)
        setChunks(all)
        setStats(computeStats(all))
      } catch {
        setChunks([])
        setStats(null)
      } finally {
        setIsChunking(false)
      }
    },
    [computeStats],
  )

  const chunkText = useCallback(
    async (textToChunk: string, fileName: string, totalPages = 0) => {
      if (!textToChunk) {
        setChunks([])
        setStats(null)
        return
      }
      setIsChunking(true)
      try {
        const all = chunkFromFlatText(textToChunk, fileName, totalPages)
        setChunks(all)
        setStats(computeStats(all))
      } catch {
        setChunks([])
        setStats(null)
      } finally {
        setIsChunking(false)
      }
    },
    [computeStats],
  )

  return { chunks, stats, isChunking, chunkBlocks, chunkText, setChunks, setStats }
}
