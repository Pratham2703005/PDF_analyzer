"use client"

import { ChatInterface } from "./chat-interface"
import { useChat } from "@/hooks/use-chat"
import { Lock, Sparkles } from "lucide-react"
import type { TextChunk } from "@/lib/types"

interface ChatTabProps {
  enabled: boolean
  chunks: TextChunk[]
}

export function ChatTab({ enabled, chunks }: ChatTabProps) {
  const { messages, isLoading, error, sendMessage } = useChat(chunks)

  if (!enabled) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center max-w-xs">
          <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/50" />
              <span className="relative inline-flex h-3 w-3 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Sparkles className="h-2 w-2" />
              </span>
            </span>
          </div>
          <p className="text-sm font-medium">Chat will unlock shortly</p>
          <p className="mt-1 text-xs text-muted-foreground">
            We&apos;re embedding your document so answers can cite the right passages.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ChatInterface
      chunks={chunks}
      onSendMessage={sendMessage}
      isLoading={isLoading}
      error={error}
      messages={messages}
    />
  )
}
