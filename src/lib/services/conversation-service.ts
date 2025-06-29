import { encode } from "gpt-tokenizer"
import type { TextChunk } from "@/lib/types"

export interface ConversationMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  chunks?: (TextChunk & { similarity: number })[]
  tokenCount: number
}

export interface ChatResponse {
  answer: string
  sources: TextChunk[]
  conversationId: string
  messageId: string
  tokenCount: number
}

export class ConversationService {
  /**
   * Generate answer using OpenAI with context chunks
   */
  static async generateAnswer(
    question: string,
    contextChunks: (TextChunk & { similarity: number })[],
    conversationHistory: ConversationMessage[] = [],
  ): Promise<string> {
    // Check if API key is available
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured")
    }

    // Prepare context from chunks
    const context = contextChunks
      .map(
        (chunk, index) =>
          `[Source ${index + 1} - Page ${chunk.pageNumber}, Similarity: ${chunk.similarity.toFixed(3)}]
${chunk.title}
${chunk.text}`,
      )
      .join("\n\n---\n\n")

    // Prepare conversation history (last 4 messages for context)
    const recentHistory = conversationHistory
      .slice(-4)
      .map((msg) => `${msg.role === "user" ? "Human" : "Assistant"}: ${msg.content}`)
      .join("\n")

    const prompt = `You are a helpful AI assistant that answers questions based on the provided document context. Use the context to provide accurate, detailed answers. If the context doesn't contain enough information, say so clearly and dont mention about sources and page numbers in your answer(answer under 300 tokens or less).

${recentHistory ? `Previous conversation:\n${recentHistory}\n\n` : ""}Context from document:
${context}

Question: ${question}
Answer:`


    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 400,
          temperature: 0.3,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        if (response.status === 401) {
          throw new Error("Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.")
        }

        throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(errorData)}`)
      }

      const data = await response.json()
      const answer = data.choices?.[0]?.message?.content?.trim()

      if (!answer) {
        throw new Error("Empty response from OpenAI")
      }

      console.log(`✅ Generated answer: "${answer.substring(0, 100)}..."`)
      return answer
    } catch (error) {
      console.error("❌ Error generating answer:", error)
      throw error
    }
  }

  /**
   * Save conversation message to database
   */
  static async saveMessage(
    role: "user" | "assistant",
    content: string,
  ): Promise<string> {
    try {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const tokenCount = encode(content).length

      // For now, we'll store in memory or use a simple approach
      // In production, you'd want to use a proper conversation table
      console.log(`💾 Saving ${role} message: "${content.substring(0, 50)}..." (${tokenCount} tokens)`)

      return messageId
    } catch (error) {
      console.error("❌ Error saving message:", error)
      throw error
    }
  }

  /**
   * Get conversation history
   */
  static async getConversationHistory(): Promise<ConversationMessage[]> {
    // For now, return empty array - in production you'd fetch from database
    return []
  }

  /**
   * Create a new conversation
   */
  static createConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
