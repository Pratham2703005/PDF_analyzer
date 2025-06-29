import { type NextRequest, NextResponse } from "next/server"
import { SummaryChunkService } from "@/lib/services/summary-chunk-service"
import type { SummaryChunk } from "@/lib/services/summarization-service"

export interface SaveSummariesRequest {
  summaries: SummaryChunk[]
  finalSummary: SummaryChunk | null
}

export interface SaveSummariesResponse {
  success: boolean
  message?: string
  savedSummaries: number
  savedFinal: boolean
  totalSaved: number
}

export async function POST(request: NextRequest) {
  try {
    console.log("💾 POST /v4/save_summaries called")

    const body: SaveSummariesRequest = await request.json()
    const { summaries, finalSummary } = body

    if (!summaries || !Array.isArray(summaries)) {
      return NextResponse.json({ success: false, message: "Invalid summaries data" }, { status: 400 })
    }

    console.log(`💾 Saving ${summaries.length} summaries and ${finalSummary ? 1 : 0} final summary`)

    const result = await SummaryChunkService.saveSummaryChunks(summaries, finalSummary)

    console.log(`✅ Save complete: ${result.totalSaved} items saved`)

    return NextResponse.json({
      success: true,
      message: `Successfully saved ${result.totalSaved} summary chunks to database`,
      savedSummaries: result.savedSummaries,
      savedFinal: result.savedFinal,
      totalSaved: result.totalSaved,
    })
  } catch (error) {
    console.error("❌ Error saving summaries:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to save summaries to database",
        savedSummaries: 0,
        savedFinal: false,
        totalSaved: 0,
      },
      { status: 500 },
    )
  }
}
