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
      console.error("❌ OpenAI API key not configured")
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

    console.log(`📊 Received chat request:`)
    console.log(`- Message: "${message}"`)
    console.log(`- Chunks available: ${chunks?.length || 0}`)
    console.log(`- Conversation history: ${conversationHistory?.length || 0} messages`)

    if (!message || !message.trim()) {
      return NextResponse.json({ success: false, error: "Message is required" }, { status: 400 })
    }

    if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
      return NextResponse.json({ success: false, error: "No chunks available for search" }, { status: 400 })
    }

    // Log chunk details
    // const chunksWithEmbeddings = chunks.filter((chunk) => chunk.embedding && chunk.embedding.length > 0)
    // console.log(`📋 Chunk analysis:`)
    // console.log(`- Total chunks: ${chunks.length}`)
    // console.log(`- Chunks with embeddings: ${chunksWithEmbeddings.length}`)
    // console.log(
    //   `- Sample chunk titles: ${chunks
    //     .slice(0, 3)
    //     .map((c) => c.title)
    //     .join(", ")}`,
    // )

    // console.log(`🔍 Processing chat message: "${message.substring(0, 100)}..." with ${chunks.length} chunks`)

    // Find similar chunks using vector search
    const { similarChunks, totalTokens } = await findSimilarChunks(message, chunks, 5, 3000)

    console.log(`📊 Search results:`)
    console.log(`- Similar chunks found: ${similarChunks.length}`)
    console.log(`- Total tokens: ${totalTokens}`)
    console.log(`- Chunk similarities: ${similarChunks.map((c) => c.similarity?.toFixed(3) || "N/A").join(", ")}`)
    console.log(`- Chunk titles: ${similarChunks.map((c) => c.title).join(", ")}`)

    if (similarChunks.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No relevant content found in the document for your question.",
      })
    }

    // Generate answer using OpenAI
    const answer = await ConversationService.generateAnswer(message, similarChunks, conversationHistory)

    console.log(`✅ Generated answer: "${answer.substring(0, 100)}..."`)

    // Generate message ID
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    console.log(`✅ Chat response generated successfully`)

    return NextResponse.json({
      success: true,
      answer,
      sources: similarChunks,
      messageId,
    })
  } catch (error) {
    console.error("❌ Chat API error:", error)
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
