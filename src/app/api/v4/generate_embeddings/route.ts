import { type NextRequest, NextResponse } from "next/server"
import { EmbeddingService } from "@/lib/embedding-service"
import type { TextChunk } from "@/lib/types"

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

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body: EmbeddingRequest = await request.json()
    const chunks = body.chunks

    if (!chunks || !Array.isArray(chunks)) {
      return NextResponse.json({ success: false, message: "Invalid chunks data" }, { status: 400 })
    }

    // Use the EmbeddingService to generate embeddings
    const { embeddings, fromCache, newlyGenerated } = await EmbeddingService.getOrCreateEmbeddings(chunks)

    // Map embeddings back to chunks
    const embeddingMap = new Map(embeddings.map((e) => [e.chunkId, e]))
    const processedChunks = chunks.map((chunk) => ({
      ...chunk,
      embedding: embeddingMap.get(chunk.id)?.embedding || [],
      similarity: embeddingMap.get(chunk.id)?.similarity || 0,
      fromCache: embeddingMap.get(chunk.id)?.fromCache || false,
    }))

    const processingTime = Date.now() - startTime

    return NextResponse.json(
      {
        chunks: processedChunks,
        success: true,
        fromCache,
        newlyGenerated,
        batchInfo: {
          totalBatches: 1,
          batchSize: chunks.length,
          processingTime,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error in generate_embeddings:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to generate embeddings",
      },
      { status: 500 },
    )
  }
}
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
