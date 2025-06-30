import { type NextRequest, NextResponse } from "next/server"
import { findSimilarChunks } from "@/lib/services/vector-search-service"
import { ConversationService } from "@/lib/services/conversation-service"
import type { TextChunk } from "@/lib/types"

export interface ChatRequest {
  message: string
  chunks: TextChunk[]
  conversationHistory?: any[]
}

export interface ChatResponse {
  success: boolean
  answer?: string
  sources?: (TextChunk & { similarity: number })[]
  error?: string
  messageId?: string
}

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables.",
        },
        { status: 400 },
      )
    }

    const body: ChatRequest = await request.json()
    const { message, chunks, conversationHistory = [] } = body

    if (!message || !message.trim()) {
      return NextResponse.json({ success: false, error: "Message is required" }, { status: 400 })
    }

    if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
      return NextResponse.json({ success: false, error: "No chunks available for search" }, { status: 400 })
    }
    const { similarChunks, totalTokens } = await findSimilarChunks(message, chunks, 5, 3000)

    if (similarChunks.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No relevant content found in the document for your question.",
      })
    }

    // Generate answer using OpenAI
    const answer = await ConversationService.generateAnswer(message, similarChunks, conversationHistory)


    // Generate message ID
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`


    return NextResponse.json({
      success: true,
      answer,
      sources: similarChunks,
      messageId,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to process chat message"

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    )
  }
}
