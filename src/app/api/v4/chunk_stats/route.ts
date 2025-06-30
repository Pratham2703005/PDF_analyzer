import { NextResponse } from "next/server"
import { ChunkService } from "@/lib/chunk-service"

export async function GET() {
  try {
    const stats = await ChunkService.getChunkStats()

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to get chunk statistics",
      },
      { status: 500 },
    )
  }
}
