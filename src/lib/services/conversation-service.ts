import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

const nvidia = createOpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});
const NVIDIA_MODEL_ID = process.env.NVIDIA_MODEL || 'meta/llama-3.3-70b-instruct';
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
    if (!process.env.NVIDIA_API_KEY) {
      throw new Error("NVIDIA API key is not configured")
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
        model: nvidia.chat(NVIDIA_MODEL_ID),
        prompt,
        maxTokens: 400,
        temperature: 0.3,
      } as any);

      if (!answer || answer.length === 0) {
        throw new Error("Empty response from NVIDIA")
      }

      
      return answer;
    } catch (error) {
      
      // Handle specific Vercel AI SDK errors
      if ((error as any)?.name === 'AI_APICallError') {
        const e = error as any;
        if (e.statusCode === 401) {
          throw new Error("Invalid NVIDIA API key. Please check your NVIDIA_API_KEY environment variable.");
        }
        throw new Error(`NVIDIA API error: ${e.statusCode} - ${e.message}`);
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