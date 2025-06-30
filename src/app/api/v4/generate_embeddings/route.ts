import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import type { TextChunk } from "@/lib/types"
import { pipeline } from "@xenova/transformers"

export interface EmbeddingRequest {
  chunks: TextChunk[]
}

export interface EmbeddingResponse {
  chunks: (TextChunk & {
    embedding?: number[]
    similarity?: number
    fromCache?: boolean
  })[]
  success: boolean
  message?: string
  fromCache?: number
  newlyGenerated?: number
  batchInfo?: {
    totalBatches: number
    batchSize: number
    processingTime: number
  }
}

let extractor: any = null

async function getEmbedding(text: string): Promise<number[]> {
  if (!extractor) {
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")
  }
  const output = await extractor(text, { pooling: "mean", normalize: true })
  return Array.from(output.data)
}

// Helper function to create batches
function createBatches<T>(array: T[], batchSize: number): T[][] {
  const batches: T[][] = []
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize))
  }
  return batches
}

// Process a single batch of chunks
async function processBatch(
  chunks: TextChunk[],
  existingMap: Map<string, any>,
): Promise<{
  processedChunks: (TextChunk & { embedding?: number[]; similarity?: number; fromCache?: boolean })[]
  fromCache: number
  newlyGenerated: number
}> {
  let fromCache = 0
  let newlyGenerated = 0
  const processedChunks: (TextChunk & { embedding?: number[]; similarity?: number; fromCache?: boolean })[] = []

  // Separate cached and new chunks
  const cachedChunks: TextChunk[] = []
  const newChunks: TextChunk[] = []

  for (const chunk of chunks) {
    const key = `${chunk.title}|${chunk.text}`
    const cached = existingMap.get(key)

    if (cached) {
      cachedChunks.push(chunk)
      processedChunks.push({
        ...chunk,
        embedding: cached.embedding,
        similarity: cached.similarity,
        fromCache: true,
      })
      fromCache++
    } else {
      newChunks.push(chunk)
    }
  }

  // Process new chunks sequentially to avoid overwhelming the model
  for (const chunk of newChunks) {
    try {
      const embedding = await getEmbedding(chunk.text)
      const similarity = 1.0

      // Store in database
      await prisma.chunks.create({
        data: {
          chunkId: chunk.id,
          text: chunk.text,
          pageNumber: chunk.pageNumber,
          title: chunk.title,
          level: chunk.level,
          tokenCount: chunk.tokenCount,
          wordCount: chunk.wordCount,
          embedding,
          similarity,
          fromCache: false,
        },
      })

      processedChunks.push({
        ...chunk,
        embedding,
        similarity,
        fromCache: false,
      })

      newlyGenerated++

      // Small delay to prevent overwhelming the system
      await new Promise((resolve) => setTimeout(resolve, 50))
    } catch (err) {
      processedChunks.push({ ...chunk, fromCache: false })
    }
  }

  return { processedChunks, fromCache, newlyGenerated }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body: EmbeddingRequest = await request.json()
    const chunks = body.chunks

    if (!chunks || !Array.isArray(chunks)) {
      return NextResponse.json({ success: false, message: "Invalid chunks data" }, { status: 400 })
    }

    const BATCH_SIZE = chunks.length > 100 ? 20 : chunks.length > 50 ? 25 : 30

    // Create batches
    const batches = createBatches(chunks, BATCH_SIZE)

    // Get existing chunks from database (do this once for all batches)
    const identifiers = chunks.map((c) => ({ title: c.title, text: c.text }))
    const existing = await prisma.chunks.findMany({
      where: {
        OR: identifiers.map((i) => ({ title: i.title, text: i.text })),
      },
    })

    const existingMap = new Map(existing.map((e) => [`${e.title}|${e.text}`, e]))

    // Process batches sequentially
    let totalFromCache = 0
    let totalNewlyGenerated = 0
    const allProcessedChunks: (TextChunk & { embedding?: number[]; similarity?: number; fromCache?: boolean })[] = []

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]

      try {
        const batchResult = await processBatch(batch, existingMap)

        allProcessedChunks.push(...batchResult.processedChunks)
        totalFromCache += batchResult.fromCache
        totalNewlyGenerated += batchResult.newlyGenerated

        // Add delay between batches to prevent system overload
        if (i < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 200))
        }
      } catch (batchError) {

        // Add chunks from failed batch without embeddings
        batch.forEach((chunk) => {
          allProcessedChunks.push({ ...chunk, fromCache: false })
        })
      }
    }

    const processingTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      chunks: allProcessedChunks,
      fromCache: totalFromCache,
      newlyGenerated: totalNewlyGenerated,
      batchInfo: {
        totalBatches: batches.length,
        batchSize: BATCH_SIZE,
        processingTime,
      },
      message: `Processed ${allProcessedChunks.length} chunks in ${batches.length} batches (${totalFromCache} from cache, ${totalNewlyGenerated} newly generated) in ${(processingTime / 1000).toFixed(2)}s`,
    })
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: "Server error during batch processing",
        chunks: [],
      },
      { status: 500 },
    )
  }
}
