import { prisma } from "@/lib/prisma"
import type { TextChunk } from "@/lib/types"

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

    // Get existing embeddings
    const existing = await prisma.embedding.findMany({
      where: { chunkId: { in: chunkIds } },
    })

    const existingMap = new Map(existing.map((e) => [e.chunkId, e]))
    const results: EmbeddingResult[] = []
    let newCount = 0

    for (const chunk of chunks) {
      const existingEmbedding = existingMap.get(chunk.id)

      if (existingEmbedding) {
        // Use cached embedding
        results.push({
          chunkId: chunk.id,
          embedding: existingEmbedding.embedding,
          similarity: existingEmbedding.similarity || 0.8,
          fromCache: true,
        })
      } else {
        // Generate new embedding
        const embedding = await this.generateEmbedding(chunk.text)
        const similarity = Math.random() * 0.3 + 0.7

        // Save to database
        await prisma.embedding.create({
          data: {
            chunkId: chunk.id,
            chunkText: chunk.text.substring(0, 1000),
            embedding,
            similarity,
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
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 200))

    // Generate fake 384-dimensional embedding
    return Array.from({ length: 384 }, () => Math.random() * 2 - 1)
  }

  static async clearEmbeddings(chunkIds?: string[]): Promise<number> {
    if (chunkIds) {
      const result = await prisma.embedding.deleteMany({
        where: { chunkId: { in: chunkIds } },
      })
      return result.count
    } else {
      const result = await prisma.embedding.deleteMany({})
      return result.count
    }
  }

  static async getEmbeddingStats(): Promise<{
    total: number
    oldestCreated: Date | null
    newestCreated: Date | null
  }> {
    const [total, oldest, newest] = await Promise.all([
      prisma.embedding.count(),
      prisma.embedding.findFirst({
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
      prisma.embedding.findFirst({
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
