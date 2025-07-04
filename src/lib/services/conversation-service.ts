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

      
      return answer;
    } catch (error) {
      
      // Handle specific Vercel AI SDK errors
      if (error.name === 'AI_APICallError') {
        if (error.statusCode === 401) {
          throw new Error("Invalid Mistral API key. Please check your MISTRAL_API_KEY environment variable.");
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


      return messageId
    } catch (error) {
      throw error
    }
  }

  /**
   * Get conversation history
   */
  static async getConversationHistory(): Promise<ConversationMessage[]> {
    return []
  }

  /**
   * Create a new conversation
   */
  static createConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}