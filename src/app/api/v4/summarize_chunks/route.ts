// import { type NextRequest, NextResponse } from "next/server"
// import { SummarizationService, type SummarizationModel } from "@/lib/services/summarization-service"
// import type { TextChunk } from "@/lib/types"

// export interface SummarizeRequest {
//   chunks: TextChunk[]
//   model?: SummarizationModel
// }

// export interface SummarizeResponse {
//   success: boolean
//   message?: string
//   summaries?: any[]
//   finalSummary?: any
//   stats?: {
//     totalProcessed: number
//     processingSteps: number
//     totalSummaries: number
//     processingTime: number
//     fromCache: number
//     newlyGenerated: number
//     model: SummarizationModel
//   }
//   requiresApiKey?: boolean
// }

// export async function POST(request: NextRequest) {
//   const startTime = Date.now()

//   try {
//     const body: SummarizeRequest = await request.json()
//     const { chunks, model = "openai" } = body


//     if (!chunks || !Array.isArray(chunks)) {
//       return NextResponse.json({ success: false, message: "Invalid chunks data" }, { status: 400 })
//     }

//     if (chunks.length === 0) {
//       return NextResponse.json({ success: false, message: "No chunks provided" }, { status: 400 })
//     }

//     console.log(`📊 Processing ${chunks.length} chunks for summarization with ${model} model`)

//     // Validate chunks have required fields
//     const validChunks = chunks.filter(
//       (chunk) => chunk.id && chunk.text && typeof chunk.text === "string" && chunk.text.trim().length > 0,
//     )

//     if (validChunks.length === 0) {
//       return NextResponse.json({ success: false, message: "No valid chunks found" }, { status: 400 })
//     }

//     if (validChunks.length !== chunks.length) {
//       console.warn(`⚠️ Filtered out ${chunks.length - validChunks.length} invalid chunks`)
//     }

//     // Perform summarization
//     const result = await SummarizationService.summarizeChunks(validChunks, model)

//     const processingTime = Date.now() - startTime

//     console.log(`✅ Summarization completed in ${processingTime}ms`)
//     console.log(`📈 Stats: ${result.totalProcessed} chunks → ${result.summaries.length} summaries → 1 final summary`)
//     console.log(`📋 Cache: ${result.fromCache} from cache, ${result.newlyGenerated} newly generated`)

//     return NextResponse.json({
//       success: true,
//       summaries: result.summaries,
//       finalSummary: result.finalSummary,
//       stats: {
//         totalProcessed: result.totalProcessed,
//         processingSteps: result.processingSteps,
//         totalSummaries: result.summaries.length,
//         processingTime,
//         fromCache: result.fromCache,
//         newlyGenerated: result.newlyGenerated,
//         model: result.model,
//       },
//       message: `Successfully summarized ${result.totalProcessed} chunks in ${result.processingSteps} steps using ${result.model} model (${result.fromCache} cached, ${result.newlyGenerated} new)`,
//     })
//   } catch (error) {
//     const processingTime = Date.now() - startTime
//     console.error("❌ Summarization error:", error)

//     let errorMessage = "Failed to summarize chunks"
//     let requiresApiKey = false

//     if (error instanceof Error) {
//       errorMessage = error.message
//       if (error.message.includes("API key") || error.message.includes("rate limit") || error.message.includes("429")) {
//         requiresApiKey = true
//       }
//     }

//     return NextResponse.json(
//       {
//         success: false,
//         message: errorMessage,
//         requiresApiKey,
//         stats: {
//           totalProcessed: 0,
//           processingSteps: 0,
//           totalSummaries: 0,
//           processingTime,
//           fromCache: 0,
//           newlyGenerated: 0,
//           model: "openai",
//         },
//       },
//       { status: 500 },
//     )
//   }
// }
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  console.log("🔥 API hit");

  let body;
  try {
    body = await request.json();
  } catch (e) {
    console.error("❌ JSON parse failed:", e);
    return NextResponse.json(
      { success: false, message: "Invalid JSON" },
      { status: 400 }
    );
  }

  console.log("✅ Body received:", body);

  return NextResponse.json({
    success: true,
    message: "Test success",
    data: body,
  });
}
