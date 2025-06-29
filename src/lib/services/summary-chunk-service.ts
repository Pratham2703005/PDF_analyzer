import { prisma } from "@/lib/prisma"
import type { SummaryChunk } from "./summarization-service"
import { pipeline } from "@xenova/transformers"

// Cache the extractor for embeddings
let extractor: any = null

async function getEmbedding(text: string): Promise<number[]> {
  if (!extractor) {
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")
  }

  const output = await extractor(text, { pooling: "mean", normalize: true })
  return Array.from(output.data)
}

export class SummaryChunkService {
  static async saveSummaryChunks(
    summaries: SummaryChunk[],
    finalSummary: SummaryChunk | null,
  ): Promise<{
    savedSummaries: number
    savedFinal: boolean
    totalSaved: number
  }> {
    console.log(`💾 Saving ${summaries.length} summaries and ${finalSummary ? 1 : 0} final summary to database`)

    let savedSummaries = 0
    let savedFinal = false

    // Save intermediate summaries
    for (const summary of summaries) {
      try {
        // Generate embedding for the summary
        const embedding = await getEmbedding(summary.text)

        // Check if summary already exists
        const existing = await prisma.summaryChunks.findUnique({
          where: { summaryId: summary.id },
        })

        if (!existing) {
          await prisma.summaryChunks.create({
            data: {
              summaryId: summary.id,
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
          savedSummaries++
          console.log(`✅ Saved summary: ${summary.id}`)
        } else {
          console.log(`⏭️ Summary already exists: ${summary.id}`)
        }

        // Small delay to prevent overwhelming the system
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`❌ Error saving summary ${summary.id}:`, error)
      }
    }

    // Save final summary
    if (finalSummary) {
      try {
        // Generate embedding for the final summary
        const embedding = await getEmbedding(finalSummary.text)

        // Check if final summary already exists
        const existing = await prisma.summaryChunks.findUnique({
          where: { summaryId: finalSummary.id },
        })

        if (!existing) {
          await prisma.summaryChunks.create({
            data: {
              summaryId: finalSummary.id,
              title: finalSummary.title,
              text: finalSummary.text,
              pageNumber: finalSummary.pageNumber,
              level: finalSummary.level,
              tokenCount: finalSummary.tokenCount,
              wordCount: finalSummary.wordCount,
              type: finalSummary.type,
              sourceChunkIds: finalSummary.sourceChunkIds,
              summaryIndex: finalSummary.summaryIndex,
              embedding,
              similarity: 1.0,
              fromCache: false,
            },
          })
          savedFinal = true
          console.log(`✅ Saved final summary: ${finalSummary.id}`)
        } else {
          console.log(`⏭️ Final summary already exists: ${finalSummary.id}`)
        }
      } catch (error) {
        console.error(`❌ Error saving final summary:`, error)
      }
    }

    const totalSaved = savedSummaries + (savedFinal ? 1 : 0)
    console.log(
      `💾 Summary save complete: ${savedSummaries} summaries + ${savedFinal ? 1 : 0} final = ${totalSaved} total`,
    )

    return {
      savedSummaries,
      savedFinal,
      totalSaved,
    }
  }

  static async getAllSummaryChunks(): Promise<SummaryChunk[]> {
    const summaryChunks = await prisma.summaryChunks.findMany({
      orderBy: [{ level: "asc" }, { summaryIndex: "asc" }],
    })

    return summaryChunks.map((chunk) => ({
      id: chunk.summaryId,
      title: chunk.title,
      text: chunk.text,
      pageNumber: chunk.pageNumber,
      level: chunk.level,
      tokenCount: chunk.tokenCount,
      wordCount: chunk.wordCount,
      type: chunk.type as "summary" | "final_summary",
      sourceChunkIds: chunk.sourceChunkIds,
      summaryIndex: chunk.summaryIndex,
    }))
  }

  static async clearAllSummaryChunks(): Promise<number> {
    const result = await prisma.summaryChunks.deleteMany({})
    console.log(`🗑️ Cleared ${result.count} summary chunks from database`)
    return result.count
  }

  static async getSummaryStats(): Promise<{
    total: number
    intermediate: number
    final: number
    totalTokens: number
    averageLength: number
  }> {
    const [total, intermediate, final, allChunks] = await Promise.all([
      prisma.summaryChunks.count(),
      prisma.summaryChunks.count({ where: { type: "summary" } }),
      prisma.summaryChunks.count({ where: { type: "final_summary" } }),
      prisma.summaryChunks.findMany({
        select: { tokenCount: true, text: true },
      }),
    ])

    const totalTokens = allChunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0)
    const averageLength =
      allChunks.length > 0 ? allChunks.reduce((sum, chunk) => sum + chunk.text.length, 0) / allChunks.length : 0

    return {
      total,
      intermediate,
      final,
      totalTokens,
      averageLength,
    }
  }
}
