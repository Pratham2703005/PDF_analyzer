"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy } from "lucide-react"
import type { TextChunk } from "@/lib/types"

interface ChunkCardProps {
  chunk: TextChunk
  onCopy: (text: string) => void
  onClick?: (chunk: TextChunk) => void
}

export function ChunkCard({ chunk, onCopy, onClick }: ChunkCardProps) {
  const levelColors: Record<number, string> = {
    1: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    2: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    3: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    4: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  }

  return (
    <Card className="mb-4 transition-shadow hover:shadow-md" onClick={() => onClick?.(chunk)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-base font-semibold">{chunk.title}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onCopy(chunk.text)
            }}
            className="h-7 w-7 p-0 shrink-0"
          >
            <Copy className="h-4 w-4" />
            <span className="sr-only">Copy chunk text</span>
          </Button>
        </div>
        <div className="flex items-center flex-wrap gap-2 pt-2">
          <Badge variant="outline" className="text-xs">
            Page {chunk.pageNumber}
          </Badge>
          <Badge className={`text-xs ${levelColors[chunk.level] || ""}`}>Level {chunk.level}</Badge>
          <Badge variant="secondary" className="text-xs">
            {chunk.wordCount} words
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {chunk.tokenCount} tokens
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-2 pb-4">
        <div className="text-sm leading-relaxed whitespace-pre-wrap">{chunk.text}</div>
      </CardContent>
    </Card>
  )
}
