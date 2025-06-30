import { type NextRequest, NextResponse } from "next/server"
import { ChunkService } from "@/lib/chunk-service"

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { chunkIds } = body

    const deletedCount = await ChunkService.clearChunks(chunkIds)

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedCount} chunks`,
      deletedCount,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to clear chunks",
      },
      { status: 500 },
    )
  }
}
