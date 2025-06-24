"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { encode } from "gpt-tokenizer"

interface RawTextViewerProps {
  rawText: string
  onCopyAll: (text: string) => void
}

export function RawTextViewer({ rawText, onCopyAll }: RawTextViewerProps) {
  if (!rawText)
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 p-6">
        <p>No raw text extracted.</p>
      </div>
    )

  const tokenCount = encode(rawText).length

  return (
    <ScrollArea className="h-full p-1">
      <div className="p-5">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {tokenCount.toLocaleString()} tokens extracted
          </span>
          <Button variant="outline" size="sm" onClick={() => onCopyAll(rawText)}>
            Copy All Text
          </Button>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-700 p-4">
          <pre className="whitespace-pre-wrap text-sm leading-relaxed">{rawText}</pre>
        </div>
      </div>
    </ScrollArea>
  )
}
