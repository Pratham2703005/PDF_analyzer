"use client"

import { ChatInterface } from "./chat-interface"
import { useChat } from "@/hooks/use-chat"
import { Lock } from "lucide-react"
import type { TextChunk } from "@/lib/types"

interface ChatTabProps {
  enabled: boolean
  chunks: TextChunk[]
}

export function ChatTab({ enabled, chunks }: ChatTabProps) {
  const { messages, isLoading, error, sendMessage } = useChat(chunks)
  
  if (!enabled) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 p-6">
        <div className="text-center">
          <Lock className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-lg mb-2">Chat Coming Soon</p>
          <p className="text-sm">Chat will be enabled once document processing is complete</p>
          <p className="text-xs mt-2 text-muted-foreground">Processing: Extract → Summarize → Embed → Save → Chat</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full">
      <ChatInterface
        chunks={chunks}
        onSendMessage={sendMessage}
        isLoading={isLoading}
        error={error}
        messages={messages}
      />
    </div>
  )
}
