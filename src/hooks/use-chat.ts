"use client"

import { useState, useCallback } from "react"
import type { TextChunk } from "@/lib/types"
import type { ConversationMessage } from "@/lib/services/conversation-service"
import { encode } from "gpt-tokenizer"

export function useChat(chunks: TextChunk[]) {
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const sendMessage = useCallback(
    async (question: string) => {
      if (!question.trim() || chunks.length === 0) return
      
      setIsLoading(true)
      setError("")

      console.log(`💬 useChat: Sending message "${question}" with ${chunks.length} chunks`)

      // Add user message immediately
      const userMessage: ConversationMessage = {
        id: `user_${Date.now()}`,
        role: "user",
        content: question,
        timestamp: new Date(),
        tokenCount: encode(question).length,
      }

      setMessages((prev) => [...prev, userMessage])

      try {
        console.log(`🚀 Making API call to /api/chat`)

        // Call the chat API
        const response = await fetch("/api/chat", {
          
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: question,
            chunks,
            conversationHistory: messages.slice(-4), // Last 4 messages for context
          }),
        })

        console.log(`📡 API response status: ${response.status}`)

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`❌ API error response: ${errorText}`)
          throw new Error(`API request failed: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        console.log(`📦 API response data:`, data)

        if (!data.success) {
          throw new Error(data.error || "Failed to get response")
        }

        // Create assistant message
        const assistantMessage: ConversationMessage = {
          id: data.messageId || `assistant_${Date.now()}`,
          role: "assistant",
          content: data.answer,
          timestamp: new Date(),
          chunks: data.sources,
          tokenCount: encode(data.answer).length,
        }

        setMessages((prev) => [...prev, assistantMessage])

        console.log(`✅ Chat response received successfully`)
      } catch (err) {
        console.error("❌ Chat error:", err)
        const errorMessage = err instanceof Error ? err.message : "Failed to generate response"
        setError(errorMessage)

        // Remove the user message if there was an error
        setMessages((prev) => prev.slice(0, -1))
      } finally {
        setIsLoading(false)
      }
    },
    [chunks, messages],
  )

  const clearChat = useCallback(() => {
    setMessages([])
    setError("")
  }, [])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
  }
}
