import { mistral } from '@ai-sdk/mistral';
import { generateText } from 'ai';
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
   * Generate answer using Mistral AI with context chunks
   */
  static async generateAnswer(
    question: string,
    contextChunks: (TextChunk & { similarity: number })[],
    conversationHistory: ConversationMessage[] = [],
  ): Promise<string> {
    // Check if API key is available
    if (!process.env.MISTRAL_API_KEY) {
      throw new Error("Mistral API key is not configured")
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

    console.log(`🤖 Calling Mistral AI for question: "${question.substring(0, 50)}..."`);

    try {
      const { text: answer, usage } = await generateText({
        model: mistral('mistral-large-latest'),
        prompt,
        maxTokens: 400,
        temperature: 0.3,
      });

      if (!answer || answer.length === 0) {
        throw new Error("Empty response from Mistral AI")
      }

      console.log(`✅ Generated answer: "${answer.substring(0, 100)}..."`);
      console.log(`📊 Token usage - Input: ${usage.promptTokens}, Output: ${usage.completionTokens}, Total: ${usage.totalTokens}`);
      
      return answer;
    } catch (error) {
      console.error("❌ Error generating answer:", error);
      
      // Handle specific Vercel AI SDK errors
      if (error.name === 'AI_APICallError') {
        if (error.statusCode === 401) {
          throw new Error("Invalid Mistral API key. Please check your MISTRAL_API_KEY environment variable.");
        }
        if (error.statusCode === 429) {
          console.error(`🚫 Rate limit hit for question generation`);
        }
        throw new Error(`Mistral API error: ${error.statusCode} - ${error.message}`);
      }
      
      throw error;
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