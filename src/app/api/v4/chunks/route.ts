import { type NextRequest, NextResponse } from "next/server"
import { ChunkService } from "@/lib/chunk-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get("page")
    const level = searchParams.get("level")
    const chunkId = searchParams.get("chunkId")

    if (chunkId) {
      // Get specific chunk
      const chunk = await ChunkService.getChunkById(chunkId)
      if (!chunk) {
        return NextResponse.json({ success: false, message: "Chunk not found" }, { status: 404 })
      }
      return NextResponse.json({ success: true, chunk })
    }

    if (page) {
      // Get chunks by page
      const chunks = await ChunkService.getChunksByPage(Number.parseInt(page))
      return NextResponse.json({ success: true, chunks })
    }

    if (level) {
      // Get chunks by level
      const chunks = await ChunkService.getChunksByLevel(Number.parseInt(level))
      return NextResponse.json({ success: true, chunks })
    }

    // Get all chunks
    const chunks = await ChunkService.getAllChunks()
    return NextResponse.json({ success: true, chunks })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to get chunks",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { chunkId, updates } = body

    if (!chunkId) {
      return NextResponse.json({ success: false, message: "chunkId is required" }, { status: 400 })
    }

    const updatedChunk = await ChunkService.updateChunk(chunkId, updates)
    if (!updatedChunk) {
      return NextResponse.json({ success: false, message: "Failed to update chunk" }, { status: 404 })
    }

    return NextResponse.json({ success: true, chunk: updatedChunk })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update chunk",
      },
      { status: 500 },
    )
  }
}
