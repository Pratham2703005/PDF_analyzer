import { encode } from "gpt-tokenizer"
import type { TextChunk } from "@/lib/types"
import { pipeline } from "@xenova/transformers"
import { prisma } from "@/lib/prisma"


import { mistral } from '@ai-sdk/mistral';
import { generateText } from 'ai';

// Cache the summarization pipeline
let summarizer: any = null

async function initializeSummarizer() {
  if (!summarizer) {
    try {
      summarizer = await pipeline("summarization", "Xenova/distilbart-cnn-12-6", {
        quantized: true,
      })
    } catch (error) {
      throw new Error(
        "Failed to initialize local summarization model. Please ensure you have a stable internet connection for the initial model download.",
      )
    }
  }
  return summarizer
}

export interface SummaryChunk {
  id: string
  title: string
  text: string
  pageNumber: number
  level: number
  tokenCount: number
  wordCount: number
  type: "summary" | "final_summary"
  sourceChunkIds: string[]
  summaryIndex: number
}

export interface SummarizationStats {
  totalProcessed: number
  processingSteps: number
  totalSummaries: number
  processingTime: number
  fromCache: number
  newlyGenerated: number
  model: "openai" | "local"
  rateLimitHit?: boolean
  fallbackUsed?: boolean
}

export interface SummarizationResult {
  summaries: SummaryChunk[]
  finalSummary: SummaryChunk | null
  totalProcessed: number
  processingSteps: number
  fromCache: number
  newlyGenerated: number
  model: "openai" | "local"
  rateLimitHit?: boolean
  fallbackUsed?: boolean
}

export type SummarizationModel = "openai" | "local"

export class SummarizationService {
  // Updated limits as per your requirements
  private static readonly MAX_TOKENS_PER_BATCH = 1500 // Conservative batch size
  private static readonly MAX_TOKENS_PER_MINUTE = 90000 // 90K tokens per 60s window
  private static readonly MAX_INPUT_LENGTH = 1024 // DistilBART max input length
  private static readonly MIN_LENGTH = 200
  private static readonly MAX_LENGTH = 500
  private static readonly MAX_RETRIES = 2
  private static readonly DELAY_BETWEEN_REQUESTS = 3000 // 3s between requests
  private static readonly DELAY_AFTER_TWO_BATCHES = 6000 // 6s after every 2 batches
  private static readonly DELAY_AFTER_RATE_LIMIT = 5000 // 5s after rate limit
  private static readonly LARGE_BATCH_THRESHOLD = 5 // Sequential processing for >5 batches

  // Track token usage to avoid rate limits
  private static tokenUsageTracker = {
    tokensUsed: 0,
    windowStart: Date.now(),
    windowDuration: 60000, // 1 minute
    batchCount: 0, // Track batches for throttling
  }

  /**
   * Reset token usage tracker if window has passed
   */
  private static resetTokenTrackerIfNeeded(): void {
    const now = Date.now()
    if (now - this.tokenUsageTracker.windowStart > this.tokenUsageTracker.windowDuration) {
      this.tokenUsageTracker.tokensUsed = 0
      this.tokenUsageTracker.windowStart = now
      this.tokenUsageTracker.batchCount = 0
    }
  }

  /**
   * Check if we can make an OpenAI request without hitting rate limits
   */
  private static canMakeOpenAIRequest(estimatedTokens: number): boolean {
    this.resetTokenTrackerIfNeeded()
    const wouldExceedLimit = this.tokenUsageTracker.tokensUsed + estimatedTokens > this.MAX_TOKENS_PER_MINUTE

    if (wouldExceedLimit) {
      console.warn(
        `⚠️ Would exceed 90K token limit: ${this.tokenUsageTracker.tokensUsed} + ${estimatedTokens} > ${this.MAX_TOKENS_PER_MINUTE}`,
      )
    }

    return !wouldExceedLimit
  }

  /**
   * Track token usage for rate limiting
   */
  private static trackTokenUsage(tokens: number): void {
    this.resetTokenTrackerIfNeeded()
    this.tokenUsageTracker.tokensUsed += tokens
    this.tokenUsageTracker.batchCount++
    
  }

  /**
   * Smart delay management - 6s after every 2 batches, 3s otherwise
   */
  private static async smartDelay(batchIndex: number, totalBatches: number, model: SummarizationModel): Promise<void> {
    if (model !== "openai") {
      // Local model - minimal delay
      await new Promise((resolve) => setTimeout(resolve, 500))
      return
    }

    // For OpenAI - implement your throttling strategy
    const isEverySecondBatch = this.tokenUsageTracker.batchCount % 2 === 0
    const delay = isEverySecondBatch ? this.DELAY_AFTER_TWO_BATCHES : this.DELAY_BETWEEN_REQUESTS

    if (batchIndex < totalBatches) {
     
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  /**
   * Generate a cache key for a set of chunks
   */
  private static generateCacheKey(chunks: TextChunk[], model: SummarizationModel): string {
    const chunkIds = chunks
      .map((c) => c.id)
      .sort()
      .join(",")
    const textHash = chunks
      .map((c) => c.text)
      .join("")
      .slice(0, 100)
    return `${model}_${chunkIds}_${Buffer.from(textHash).toString("base64").slice(0, 20)}`
  }

  /**
   * Generate a cache key for final summary
   */
  private static generateFinalCacheKey(summaries: SummaryChunk[], model: SummarizationModel): string {
    const summaryIds = summaries
      .map((s) => s.id)
      .sort()
      .join(",")
    const textHash = summaries
      .map((s) => s.text)
      .join("")
      .slice(0, 100)
    return `final_${model}_${summaryIds}_${Buffer.from(textHash).toString("base64").slice(0, 20)}`
  }

  /**
   * Check if summary exists in cache
   */
  private static async getCachedSummary(cacheKey: string): Promise<SummaryChunk | null> {
    try {
      const cached = await prisma.summaryChunks.findFirst({
        where: {
          summaryId: cacheKey,
        },
      })

      if (cached) {
        return {
          id: cached.summaryId,
          title: cached.title,
          text: cached.text,
          pageNumber: cached.pageNumber,
          level: cached.level,
          tokenCount: cached.tokenCount,
          wordCount: cached.wordCount,
          type: cached.type as "summary" | "final_summary",
          sourceChunkIds: cached.sourceChunkIds,
          summaryIndex: cached.summaryIndex,
        }
      }
    } catch (error) {
      console.error("❌ Error checking cache:", error)
    }
    return null
  }

  /**
   * Save summary to cache
   */
  private static async saveSummaryToCache(summary: SummaryChunk, cacheKey: string): Promise<void> {
    try {
      // Generate embedding for the summary
      const embedding = Array.from({ length: 384 }, () => Math.random() * 2 - 1) // Placeholder

      await prisma.summaryChunks.upsert({
        where: { summaryId: cacheKey },
        update: {
          title: summary.title,
          text: summary.text,
          pageNumber: summary.pageNumber,
          level: summary.level,
          tokenCount: summary.tokenCount,
          wordCount: summary.wordCount,
          type: summary.type,
          sourceChunkIds: summary.sourceChunkIds,
          summaryIndex: summary.summaryIndex,
          embedding,
          similarity: 1.0,
          fromCache: false,
        },
        create: {
          summaryId: cacheKey,
          title: summary.title,
          text: summary.text,
          pageNumber: summary.pageNumber,
          level: summary.level,
          tokenCount: summary.tokenCount,
          wordCount: summary.wordCount,
          type: summary.type,
          sourceChunkIds: summary.sourceChunkIds,
          summaryIndex: summary.summaryIndex,
          embedding,
          similarity: 1.0,
          fromCache: false,
        },
      })

    } catch (error) {
      console.error("❌ Error saving to cache:", error)
    }
  }

  /**
   * Main entry point for chunk summarization
   */
  static async summarizeChunks(
    chunks: TextChunk[],
    model: SummarizationModel = "openai",
  ): Promise<SummarizationResult> {

    if (chunks.length === 0) {
      throw new Error("No chunks provided for summarization")
    }

    let actualModel = model
    let rateLimitHit = false
    let fallbackUsed = false

    // Initialize local model if needed (or as fallback)
    if (model === "local" || model === "openai") {
      try {
        await initializeSummarizer()
      } catch (error) {
        if (model === "local") {
          throw error
        }
      }
    }

    let fromCache = 0
    let newlyGenerated = 0

    // Reset batch counter for new summarization session
    this.tokenUsageTracker.batchCount = 0

    // If we only have one chunk, summarize it directly as final summary
    if (chunks.length === 1) {
      const chunk = chunks[0]
      const cacheKey = this.generateFinalCacheKey(
        [
          {
            id: chunk.id,
            title: chunk.title,
            text: chunk.text,
            pageNumber: chunk.pageNumber,
            level: chunk.level,
            tokenCount: chunk.tokenCount,
            wordCount: chunk.wordCount,
            type: "summary",
            sourceChunkIds: [chunk.id],
            summaryIndex: 0,
          },
        ],
        actualModel,
      )

      // Check cache first
      const cachedSummary = await this.getCachedSummary(cacheKey)
      if (cachedSummary) {
        return {
          summaries: [],
          finalSummary: {
            ...cachedSummary,
            type: "final_summary",
            id: "final_summary",
            title: "Final Document Summary",
          },
          totalProcessed: 1,
          processingSteps: 1,
          fromCache: 1,
          newlyGenerated: 0,
          model: actualModel,
          rateLimitHit,
          fallbackUsed,
        }
      }

      try {
        const { summaryText, modelUsed, hitRateLimit } = await this.summarizeTextWithFallback(
          chunk.text,
          "single_chunk",
          actualModel,
        )

        if (hitRateLimit) {
          rateLimitHit = true
        }
        if (modelUsed !== actualModel) {
          fallbackUsed = true
          actualModel = modelUsed
        }

        const finalSummary: SummaryChunk = {
          id: "final_summary",
          title: "Final Document Summary",
          text: summaryText,
          pageNumber: chunk.pageNumber,
          level: 0,
          tokenCount: encode(summaryText).length,
          wordCount: summaryText.split(/\s+/).filter((word) => word.length > 0).length,
          type: "final_summary",
          sourceChunkIds: [chunk.id],
          summaryIndex: 0,
        }

        // Cache the result
        await this.saveSummaryToCache(finalSummary, cacheKey)

        return {
          summaries: [],
          finalSummary,
          totalProcessed: 1,
          processingSteps: 1,
          fromCache: 0,
          newlyGenerated: 1,
          model: actualModel,
          rateLimitHit,
          fallbackUsed,
        }
      } catch (error) {
        console.error("❌ Error summarizing single chunk:", error)
        throw error
      }
    }

    let currentChunks = chunks
    const allSummaries: SummaryChunk[] = []
    let step = 1

    // Keep summarizing until we have a manageable number of summaries
    while (currentChunks.length > 1) {
      console.log(`📝 Step ${step}: Processing ${currentChunks.length} chunks`)

      const batches = this.createBatches(currentChunks, actualModel)
      console.log(`📦 Created ${batches.length} batches for processing`)

      // Determine processing strategy based on batch count
      const useSequentialProcessing = batches.length > this.LARGE_BATCH_THRESHOLD
      if (useSequentialProcessing && actualModel === "openai") {
        console.log(
          `🔄 Using sequential processing for ${batches.length} batches (>5) to avoid rate limits and ensure stability`,
        )
      }

      const batchSummaries: SummaryChunk[] = []

      // Process batches sequentially (always for OpenAI, especially for >5 batches)
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        console.log(`🔄 Processing batch ${i + 1}/${batches.length} (${batch.length} chunks)`)

        // Check cache first
        const cacheKey = this.generateCacheKey(batch, actualModel)
        const cachedSummary = await this.getCachedSummary(cacheKey)

        if (cachedSummary) {
          console.log(`📋 Using cached summary for batch ${i + 1}`)
          batchSummaries.push(cachedSummary)
          allSummaries.push(cachedSummary)
          fromCache++
        } else {
          try {
            const { summary, modelUsed, hitRateLimit } = await this.summarizeBatchWithFallback(
              batch,
              step,
              i + 1,
              actualModel,
            )

            if (hitRateLimit) {
              rateLimitHit = true
            }
            if (modelUsed !== actualModel) {
              fallbackUsed = true
              actualModel = modelUsed
            }

            // Cache the new summary
            await this.saveSummaryToCache(summary, cacheKey)

            batchSummaries.push(summary)
            allSummaries.push(summary)
            newlyGenerated++

            console.log(`✅ Batch ${i + 1} summarized: ${summary.tokenCount} tokens`)
          } catch (error) {
            console.error(`❌ Error summarizing batch ${i + 1}:`, error)
            throw new Error(
              `Failed to summarize batch ${i + 1}: ${error instanceof Error ? error.message : String(error)}`,
            )
          }
        }

        // Smart delay management - your throttling strategy
        await this.smartDelay(i + 1, batches.length, actualModel)
      }

      currentChunks = batchSummaries
      step++

      // If we only have 1 summary, that becomes our final summary
      if (batchSummaries.length === 1) {
        console.log(`🎯 Only 1 summary generated, using it as final summary`)
        const finalSummary = { ...batchSummaries[0] }
        finalSummary.type = "final_summary"
        finalSummary.id = "final_summary"
        finalSummary.title = "Final Document Summary"

        return {
          summaries: allSummaries.slice(0, -1),
          finalSummary,
          totalProcessed: chunks.length,
          processingSteps: step - 1,
          fromCache,
          newlyGenerated,
          model: actualModel,
          rateLimitHit,
          fallbackUsed,
        }
      }

      // If we have multiple summaries, create final summary
      if (batchSummaries.length > 1 && batchSummaries.length <= 5) {
        console.log(`🎯 Creating final summary from ${batchSummaries.length} summaries`)

        // Check cache for final summary
        const finalCacheKey = this.generateFinalCacheKey(batchSummaries, actualModel)
        const cachedFinalSummary = await this.getCachedSummary(finalCacheKey)

        if (cachedFinalSummary) {
          console.log(`📋 Using cached final summary`)
          return {
            summaries: allSummaries,
            finalSummary: {
              ...cachedFinalSummary,
              type: "final_summary",
              id: "final_summary",
              title: "Final Document Summary",
            },
            totalProcessed: chunks.length,
            processingSteps: step - 1,
            fromCache: fromCache + 1,
            newlyGenerated,
            model: actualModel,
            rateLimitHit,
            fallbackUsed,
          }
        }

        try {
          const { finalSummary, modelUsed, hitRateLimit } = await this.createFinalSummaryWithFallback(
            batchSummaries,
            actualModel,
          )

          if (hitRateLimit) {
            rateLimitHit = true
          }
          if (modelUsed !== actualModel) {
            fallbackUsed = true
            actualModel = modelUsed
          }

          // Cache the final summary
          await this.saveSummaryToCache(finalSummary, finalCacheKey)

          console.log(`🏁 Final summary created: ${finalSummary.tokenCount} tokens`)

          return {
            summaries: allSummaries,
            finalSummary,
            totalProcessed: chunks.length,
            processingSteps: step - 1,
            fromCache,
            newlyGenerated: newlyGenerated + 1,
            model: actualModel,
            rateLimitHit,
            fallbackUsed,
          }
        } catch (error) {
          console.error(`❌ Error creating final summary:`, error)
          // Continue with the loop to try reducing summaries further
        }
      }
    }

    // If we end up with just one chunk, that's our final summary
    if (currentChunks.length === 1) {
      const finalSummary = { ...currentChunks[0] } as SummaryChunk
      finalSummary.type = "final_summary"
      finalSummary.id = "final_summary"
      finalSummary.title = "Final Document Summary"

      return {
        summaries: allSummaries,
        finalSummary,
        totalProcessed: chunks.length,
        processingSteps: step - 1,
        fromCache,
        newlyGenerated,
        model: actualModel,
        rateLimitHit,
        fallbackUsed,
      }
    }

    return {
      summaries: allSummaries,
      finalSummary: null,
      totalProcessed: chunks.length,
      processingSteps: step - 1,
      fromCache,
      newlyGenerated,
      model: actualModel,
      rateLimitHit,
      fallbackUsed,
    }
  }

  /**
   * Create batches based on model type with conservative sizing
   */
  private static createBatches(chunks: TextChunk[], model: SummarizationModel): TextChunk[][] {
    const batches: TextChunk[][] = []
    let currentBatch: TextChunk[] = []
    let currentSize = 0

    // Conservative limits
    const limit = model === "openai" ? this.MAX_TOKENS_PER_BATCH : this.MAX_INPUT_LENGTH - 100
    const sizeCalculator =
      model === "openai"
        ? (chunk: TextChunk) => chunk.tokenCount || encode(chunk.text).length
        : (chunk: TextChunk) => chunk.text.length

    for (const chunk of chunks) {
      const chunkSize = sizeCalculator(chunk)

      // For OpenAI, if a single chunk is too big, split it
      if (chunkSize > limit) {
        console.warn(`⚠️ Chunk ${chunk.id} (${chunkSize} tokens/chars) exceeds ${model} limit (${limit})`)

        if (currentBatch.length > 0) {
          batches.push(currentBatch)
          currentBatch = []
          currentSize = 0
        }

        // Split large chunk if using OpenAI
        if (model === "openai" && chunkSize > limit) {
          const splitChunks = this.splitLargeChunk(chunk, limit)
          splitChunks.forEach((splitChunk) => {
            batches.push([splitChunk])
          })
        } else {
          batches.push([chunk])
        }
        continue
      }

      if (currentSize + chunkSize > limit && currentBatch.length > 0) {
        batches.push(currentBatch)
        currentBatch = [chunk]
        currentSize = chunkSize
      } else {
        currentBatch.push(chunk)
        currentSize += chunkSize
      }
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch)
    }

    console.log(`📊 Created ${batches.length} batches with max ${limit} tokens/chars each`)
    return batches
  }

  /**
   * Split a large chunk into smaller pieces
   */
  private static splitLargeChunk(chunk: TextChunk, maxTokens: number): TextChunk[] {
    const text = chunk.text
    const words = text.split(/\s+/)
    const chunks: TextChunk[] = []
    let currentText = ""
    let partIndex = 1

    for (const word of words) {
      const testText = currentText ? `${currentText} ${word}` : word
      const tokenCount = encode(testText).length

      if (tokenCount > maxTokens && currentText) {
        // Create a chunk from current text
        chunks.push({
          ...chunk,
          id: `${chunk.id}_part${partIndex}`,
          title: `${chunk.title} (Part ${partIndex})`,
          text: currentText,
          tokenCount: encode(currentText).length,
          wordCount: currentText.split(/\s+/).length,
        })

        currentText = word
        partIndex++
      } else {
        currentText = testText
      }
    }

    // Add the last part
    if (currentText) {
      chunks.push({
        ...chunk,
        id: `${chunk.id}_part${partIndex}`,
        title: `${chunk.title} (Part ${partIndex})`,
        text: currentText,
        tokenCount: encode(currentText).length,
        wordCount: currentText.split(/\s+/).length,
      })
    }

    console.log(`✂️ Split large chunk into ${chunks.length} parts`)
    return chunks
  }

  /**
   * Summarize text with automatic fallback to local model
   */
  private static async summarizeTextWithFallback(
    text: string,
    context: string,
    preferredModel: SummarizationModel,
  ): Promise<{ summaryText: string; modelUsed: SummarizationModel; hitRateLimit: boolean }> {
    let hitRateLimit = false

    // Try preferred model first
    if (preferredModel === "openai") {
      try {
        const estimatedTokens = encode(text).length * 1.5 // Estimate input + output tokens

        if (!this.canMakeOpenAIRequest(estimatedTokens)) {
          console.warn(`⚠️ Rate limit would be exceeded, falling back to local model for ${context}`)
          hitRateLimit = true
          const summaryText = await this.summarizeWithLocal(text, context)
          return { summaryText, modelUsed: "local", hitRateLimit }
        }

        const summaryText = await this.summarizeWithOpenAI(text, context)
        this.trackTokenUsage(estimatedTokens)
        return { summaryText, modelUsed: "openai", hitRateLimit }
      } catch (error) {
        console.error(`❌ OpenAI failed for ${context}, falling back to local:`, error)

        if (error instanceof Error && (error.message.includes("429") || error.message.includes("rate limit"))) {
          hitRateLimit = true
          // Wait before falling back
          await new Promise((resolve) => setTimeout(resolve, this.DELAY_AFTER_RATE_LIMIT))
        }

        const summaryText = await this.summarizeWithLocal(text, context)
        return { summaryText, modelUsed: "local", hitRateLimit }
      }
    } else {
      const summaryText = await this.summarizeWithLocal(text, context)
      return { summaryText, modelUsed: "local", hitRateLimit }
    }
  }

  /**
   * Summarize a batch with fallback
   */
  private static async summarizeBatchWithFallback(
    chunks: TextChunk[],
    step: number,
    batchIndex: number,
    preferredModel: SummarizationModel,
  ): Promise<{ summary: SummaryChunk; modelUsed: SummarizationModel; hitRateLimit: boolean }> {
    const combinedText = chunks.map((chunk) => `[${chunk.title}]\n${chunk.text}`).join("\n\n---\n\n")

    const { summaryText, modelUsed, hitRateLimit } = await this.summarizeTextWithFallback(
      combinedText,
      `batch ${batchIndex}`,
      preferredModel,
    )

    const summaryId = `summary_${step}_${batchIndex}`
    const tokenCount = encode(summaryText).length
    const wordCount = summaryText.split(/\s+/).filter((word) => word.length > 0).length

    const summary: SummaryChunk = {
      id: summaryId,
      title: `Summary ${step}.${batchIndex}`,
      text: summaryText,
      pageNumber: 0,
      level: step,
      tokenCount,
      wordCount,
      type: "summary",
      sourceChunkIds: chunks.map((c) => c.id),
      summaryIndex: batchIndex,
    }

    return { summary, modelUsed, hitRateLimit }
  }

  /**
   * Create final summary with fallback
   */
  private static async createFinalSummaryWithFallback(
    summaries: SummaryChunk[],
    preferredModel: SummarizationModel,
  ): Promise<{ finalSummary: SummaryChunk; modelUsed: SummarizationModel; hitRateLimit: boolean }> {
    const combinedSummaries = summaries.map((summary) => `[${summary.title}]\n${summary.text}`).join("\n\n---\n\n")

    console.log(`🎯 Creating final summary from ${summaries.length} intermediate summaries`)

    const { summaryText, modelUsed, hitRateLimit } = await this.summarizeTextWithFallback(
      combinedSummaries,
      "final summary",
      preferredModel,
    )

    const tokenCount = encode(summaryText).length
    const wordCount = summaryText.split(/\s+/).filter((word) => word.length > 0).length

    const finalSummary: SummaryChunk = {
      id: "final_summary",
      title: "Final Document Summary",
      text: summaryText,
      pageNumber: 0,
      level: 0,
      tokenCount,
      wordCount,
      type: "final_summary",
      sourceChunkIds: summaries.flatMap((s) => s.sourceChunkIds),
      summaryIndex: 0,
    }

    return { finalSummary, modelUsed, hitRateLimit }
  }

  /**
   * Summarize with OpenAI with better error handling
   */
private static async summarizeWithOpenAI(text: string, context: string): Promise<string> {
  const maxInputTokens = this.MAX_TOKENS_PER_BATCH - 500; // Reserve tokens for output
  const inputTokens = encode(text).length;

  let textToSummarize = text;
  if (inputTokens > maxInputTokens) {
    const maxChars = Math.floor(maxInputTokens * 3.5); // Rough chars per token
    textToSummarize = text.substring(0, maxChars) + "...";
    console.log(`⚠️ Truncated input for ${context} from ${inputTokens} to ~${maxInputTokens} tokens`);
  }

  const prompt = `Please provide a comprehensive summary of the following text. Focus on the key points, main ideas, and important details. Make the summary clear, well-structured, under 300tokens(don't mention that in answer):

${textToSummarize}`;

  console.log(`🤖 Calling Mistral Large for ${context} (~${encode(textToSummarize).length} tokens)`);

  try {
    const { text: summaryText, usage } = await generateText({
      model: mistral('mistral-large-latest'),
      prompt,
      maxTokens: 400, // Target ~400 tokens as mentioned in original prompt
      temperature: 0.3, // Lower temperature for more consistent summaries
    });

    if (!summaryText || summaryText.length === 0) {
      throw new Error("Empty response from OpenAI");
    }

    console.log(`📄 Mistral Response for ${context}: "${summaryText.substring(0, 100)}..."`);
    console.log(`📊 Token usage - Input: ${usage.promptTokens}, Output: ${usage.completionTokens}, Total: ${usage.totalTokens}`);
    
    return summaryText;
  } catch (error) {
    console.error(`❌ Mistral error for ${context}:`, error);
    
    // Handle specific Vercel AI SDK errors
    if (error.name === 'AI_APICallError') {
      if (error.statusCode === 429) {
        console.error(`🚫 Rate limit hit for ${context}`);
      }
      throw new Error(`Mistral API error: ${error.statusCode} - ${error.message}`);
    }
    
    throw error;
  }
}

  /**
   * Summarize with local DistilBART
   */
  private static async summarizeWithLocal(text: string, context: string): Promise<string> {
    let textToSummarize = text
    if (text.length > this.MAX_INPUT_LENGTH) {
      textToSummarize = text.substring(0, this.MAX_INPUT_LENGTH - 3) + "..."
      console.log(`⚠️ Truncated input for ${context} to fit local model limit`)
    }

    console.log(`🤖 Calling DistilBART for ${context} (~${textToSummarize.length} characters)`)

    try {
      const result = await summarizer(textToSummarize, {
        min_length: this.MIN_LENGTH,
        max_length: this.MAX_LENGTH,
        do_sample: false,
      })

      const summaryText = result[0]?.summary_text || result.summary_text || ""

      if (!summaryText || summaryText.trim().length === 0) {
        throw new Error("Empty response from DistilBART model")
      }

      console.log(`📄 DistilBART Response for ${context}: "${summaryText.substring(0, 100)}..."`)
      return summaryText.trim()
    } catch (error) {
      console.error(`❌ DistilBART error for ${context}:`, error)
      throw error
    }
  }
}
