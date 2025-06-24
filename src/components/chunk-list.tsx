"use client"

import { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { ChunkCard } from "./chunk-card"
import type { TextChunk } from "@/lib/types"

interface ChunkListProps {
  chunks: TextChunk[]
  onCopyChunk: (text: string) => void
  onChunkClick: (chunk: TextChunk) => void
}

const CHUNKS_PER_PAGE = 5

export function ChunkList({ chunks, onCopyChunk, onChunkClick }: ChunkListProps) {
  const [page, setPage] = useState(1)
  const totalPages = Math.ceil(chunks.length / CHUNKS_PER_PAGE)

  if (chunks.length === 0)
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <p>No chunks to display.</p>
      </div>
    )

  const start = (page - 1) * CHUNKS_PER_PAGE
  const visible = chunks.slice(start, start + CHUNKS_PER_PAGE)

  return (
    <div className="flex flex-col h-full">
      {totalPages > 1 && (
        <div className="flex justify-center gap-4 p-4">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1}>
            Prev
          </Button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
      <ScrollArea className="flex-1 p-1">
        <div className="p-5 space-y-4">
          {visible.map((chunk) => (
            <ChunkCard key={chunk.id} chunk={chunk} onCopy={onCopyChunk} onClick={onChunkClick} />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
