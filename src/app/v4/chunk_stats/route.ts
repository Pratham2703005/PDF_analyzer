import { type NextRequest, NextResponse } from "next/server"
import { ChunkService } from "@/lib/chunk-service"

export async function GET(request: NextRequest) {
  try {
    const stats = await ChunkService.getChunkStats()

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error("Error getting chunk stats:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to get chunk statistics",
      },
      { status: 500 },
    )
  }
}
