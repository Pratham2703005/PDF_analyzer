import { prisma } from "@/lib/prisma"
import type { TextChunk } from "@/lib/types"
import { pipeline } from "@xenova/transformers"

export interface EmbeddingResult {
  chunkId: string
  embedding: number[]
  similarity: number
  fromCache: boolean
}

export class EmbeddingService {
  static async getOrCreateEmbeddings(chunks: TextChunk[]): Promise<{
    embeddings: EmbeddingResult[]
    fromCache: number
    newlyGenerated: number
  }> {
    const chunkIds = chunks.map((chunk) => chunk.id)

    // Get existing embeddings from DB
    const existing = await prisma.chunks.findMany({
      where: {
        chunkId: { in: chunkIds },
      },
    })

    const existingMap = new Map(existing.map((e) => [e.chunkId, e]))
    const results: EmbeddingResult[] = []
    let newCount = 0

    for (const chunk of chunks) {
      const existingEmbedding = existingMap.get(chunk.id)

      if (existingEmbedding?.embedding?.length) {
        // Use cached
        results.push({
          chunkId: chunk.id,
          embedding: existingEmbedding.embedding,
          similarity: existingEmbedding.similarity || 0.8,
          fromCache: true,
        })
      } else {
        // Generate new
        const embedding = await this.generateEmbedding(chunk.text)
        const similarity = Math.random() * 0.3 + 0.7

        // Save to DB
        await prisma.chunks.upsert({
          where: { chunkId: chunk.id },
          update: {
            embedding,
            similarity,
            fromCache: false,
          },
          create: {
            chunkId: chunk.id,
            text: chunk.text.substring(0, 1000),
            pageNumber: chunk.pageNumber || 0,
            title: chunk.title || "Untitled",
            level: chunk.level || 0,
            tokenCount: chunk.tokenCount || 0,
            wordCount: chunk.wordCount || 0,
            embedding,
            similarity,
            fromCache: false,
          },
        })

        results.push({
          chunkId: chunk.id,
          embedding,
          similarity,
          fromCache: false,
        })

        newCount++
      }
    }

    return {
      embeddings: results,
      fromCache: existing.length,
      newlyGenerated: newCount,
    }
  }

  private static async generateEmbedding(text: string): Promise<number[]> {
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
    const output = await extractor(text, {
      pooling: 'mean',
      normalize: true,
    })
    return Array.from(output.data)
  }

  static async clearEmbeddings(chunkIds?: string[]): Promise<number> {
    const result = await prisma.chunks.deleteMany({
      where: chunkIds ? { chunkId: { in: chunkIds } } : {},
    })
    return result.count
  }

  static async getEmbeddingStats(): Promise<{
    total: number
    oldestCreated: Date | null
    newestCreated: Date | null
  }> {
    const [total, oldest, newest] = await Promise.all([
      prisma.chunks.count(),
      prisma.chunks.findFirst({
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
      prisma.chunks.findFirst({
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ])

    return {
      total,
      oldestCreated: oldest?.createdAt || null,
      newestCreated: newest?.createdAt || null,
    }
  }
}
