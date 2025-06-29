import { prisma } from "@/lib/prisma"
import type { TextChunk } from "@/lib/types"
import { pipeline } from "@xenova/transformers"

// Cache the extractor
let extractor: any = null

async function getEmbedding(text: string): Promise<number[]> {
  if (!extractor) {
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")
  }

  const output = await extractor(text, { pooling: "mean", normalize: true })
  return Array.from(output.data)
}

export class ChunkService {
  static async getOrCreateChunks(chunks: TextChunk[]): Promise<{
    chunks: TextChunk[]
    fromCache: number
    newlyGenerated: number
  }> {
    const chunkIds = chunks.map((chunk) => chunk.id)

    // Get existing chunks using chunkId field
    const existing = await prisma.chunks.findMany({
      where: { chunkId: { in: chunkIds } },
    })

    const existingMap = new Map(existing.map((chunk) => [chunk.chunkId, chunk]))
    const results: TextChunk[] = []
    let newCount = 0

    for (const chunk of chunks) {
      const existingChunk = existingMap.get(chunk.id)

      if (existingChunk) {
        // Use cached chunk
        results.push({
          id: existingChunk.chunkId,
          text: existingChunk.text,
          pageNumber: existingChunk.pageNumber,
          title: existingChunk.title,
          level: existingChunk.level,
          tokenCount: existingChunk.tokenCount,
          wordCount: existingChunk.wordCount,
          embedding: existingChunk.embedding,
          similarity: existingChunk.similarity,
          fromCache: true,
        })
      } else {
        // Generate real embedding and store complete chunk
        const embedding = await getEmbedding(chunk.text)
        const similarity = 1.0

        // Save complete chunk to database
        const savedChunk = await prisma.chunks.create({
          data: {
            chunkId: chunk.id, // Use chunkId field
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

        results.push({
          id: savedChunk.chunkId,
          text: savedChunk.text,
          pageNumber: savedChunk.pageNumber,
          title: savedChunk.title,
          level: savedChunk.level,
          tokenCount: savedChunk.tokenCount,
          wordCount: savedChunk.wordCount,
          embedding: savedChunk.embedding,
          similarity: savedChunk.similarity,
          fromCache: false,
        })

        newCount++
      }
    }

    return {
      chunks: results,
      fromCache: existing.length,
      newlyGenerated: newCount,
    }
  }

  static async clearChunks(chunkIds?: string[]): Promise<number> {
    if (chunkIds) {
      const result = await prisma.chunks.deleteMany({
        where: { chunkId: { in: chunkIds } }, // Use chunkId field
      })
      return result.count
    } else {
      const result = await prisma.chunks.deleteMany({})
      return result.count
    }
  }

  static async getChunkStats(): Promise<{
    total: number
    withEmbeddings: number
    oldestCreated: Date | null
    newestCreated: Date | null
    averageSimilarity: number
    levelDistribution: { [key: number]: number }
    pageDistribution: { [key: number]: number }
  }> {
    const [total, withEmbeddings, oldest, newest, avgSimilarity, allChunks] = await Promise.all([
      prisma.chunks.count(),
      prisma.chunks.count(),
      prisma.chunks.findFirst({
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
      prisma.chunks.findFirst({
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.chunks.aggregate({
        _avg: {
          similarity: true,
        },
      }),
      prisma.chunks.findMany({
        select: { level: true, pageNumber: true },
      }),
    ])

    // Calculate distributions
    const levelDistribution: { [key: number]: number } = {}
    const pageDistribution: { [key: number]: number } = {}

    allChunks.forEach((chunk) => {
      levelDistribution[chunk.level] = (levelDistribution[chunk.level] || 0) + 1
      pageDistribution[chunk.pageNumber] = (pageDistribution[chunk.pageNumber] || 0) + 1
    })

    return {
      total,
      withEmbeddings,
      oldestCreated: oldest?.createdAt || null,
      newestCreated: newest?.createdAt || null,
      averageSimilarity: avgSimilarity._avg.similarity || 0,
      levelDistribution,
      pageDistribution,
    }
  }

  static async searchSimilarChunks(queryEmbedding: number[], limit = 10): Promise<TextChunk[]> {
    // Note: This is a simplified similarity search
    // In production, you'd want to use a vector database or implement proper cosine similarity
    const chunks = await prisma.chunks.findMany({
      take: limit,
      orderBy: { similarity: "desc" },
    })

    return chunks.map((chunk) => ({
      id: chunk.chunkId,
      text: chunk.text,
      pageNumber: chunk.pageNumber,
      title: chunk.title,
      level: chunk.level,
      tokenCount: chunk.tokenCount,
      wordCount: chunk.wordCount,
      embedding: chunk.embedding,
      similarity: chunk.similarity,
      fromCache: true,
    }))
  }

  static async getChunksByPage(pageNumber: number): Promise<TextChunk[]> {
    const chunks = await prisma.chunks.findMany({
      where: { pageNumber },
      orderBy: { level: "asc" },
    })

    return chunks.map((chunk) => ({
      id: chunk.chunkId,
      text: chunk.text,
      pageNumber: chunk.pageNumber,
      title: chunk.title,
      level: chunk.level,
      tokenCount: chunk.tokenCount,
      wordCount: chunk.wordCount,
      embedding: chunk.embedding,
      similarity: chunk.similarity,
      fromCache: true,
    }))
  }

  static async getChunksByLevel(level: number): Promise<TextChunk[]> {
    const chunks = await prisma.chunks.findMany({
      where: { level },
      orderBy: { pageNumber: "asc" },
    })

    return chunks.map((chunk) => ({
      id: chunk.chunkId,
      text: chunk.text,
      pageNumber: chunk.pageNumber,
      title: chunk.title,
      level: chunk.level,
      tokenCount: chunk.tokenCount,
      wordCount: chunk.wordCount,
      embedding: chunk.embedding,
      similarity: chunk.similarity,
      fromCache: true,
    }))
  }

  static async getAllChunks(): Promise<TextChunk[]> {
    const chunks = await prisma.chunks.findMany({
      orderBy: [{ pageNumber: "asc" }, { level: "asc" }],
    })

    return chunks.map((chunk) => ({
      id: chunk.chunkId,
      text: chunk.text,
      pageNumber: chunk.pageNumber,
      title: chunk.title,
      level: chunk.level,
      tokenCount: chunk.tokenCount,
      wordCount: chunk.wordCount,
      embedding: chunk.embedding,
      similarity: chunk.similarity,
      fromCache: true,
    }))
  }

  static async getChunkById(chunkId: string): Promise<TextChunk | null> {
    const chunk = await prisma.chunks.findUnique({
      where: { chunkId }, // Use chunkId field
    })

    if (!chunk) return null

    return {
      id: chunk.chunkId,
      text: chunk.text,
      pageNumber: chunk.pageNumber,
      title: chunk.title,
      level: chunk.level,
      tokenCount: chunk.tokenCount,
      wordCount: chunk.wordCount,
      embedding: chunk.embedding,
      similarity: chunk.similarity,
      fromCache: true,
    }
  }

  static async updateChunk(chunkId: string, updates: Partial<TextChunk>): Promise<TextChunk | null> {
    try {
      const updatedChunk = await prisma.chunks.update({
        where: { chunkId },
        data: {
          ...(updates.text && { text: updates.text }),
          ...(updates.pageNumber && { pageNumber: updates.pageNumber }),
          ...(updates.title && { title: updates.title }),
          ...(updates.level && { level: updates.level }),
          ...(updates.tokenCount && { tokenCount: updates.tokenCount }),
          ...(updates.wordCount && { wordCount: updates.wordCount }),
          ...(updates.embedding && { embedding: updates.embedding }),
          ...(updates.similarity && { similarity: updates.similarity }),
        },
      })

      return {
        id: updatedChunk.chunkId,
        text: updatedChunk.text,
        pageNumber: updatedChunk.pageNumber,
        title: updatedChunk.title,
        level: updatedChunk.level,
        tokenCount: updatedChunk.tokenCount,
        wordCount: updatedChunk.wordCount,
        embedding: updatedChunk.embedding,
        similarity: updatedChunk.similarity,
        fromCache: true,
      }
    } catch (error) {
      console.error("Error updating chunk:", error)
      return null
    }
  }
}
