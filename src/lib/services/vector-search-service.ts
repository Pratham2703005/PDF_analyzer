import type { TextChunk } from "@/lib/types"
import { pipeline } from "@xenova/transformers"

// Cache the embedding model
let embedder: any = null

async function initializeEmbedder() {
  if (!embedder) {
    console.log("🔍 Initializing embedding model for search...")
    try {
      // Use the same model as in chunk-service.ts for consistency
      embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
        quantized: true,
        // Ensure models are loaded from CDN, not local paths
        cache_dir: undefined,
      })
      console.log("✅ Embedding model ready for search")
    } catch (error) {
      console.error("❌ Failed to initialize embedding model:", error)
      throw new Error("Failed to load embedding model. Please check your internet connection.")
    }
  }
  return embedder
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same length")
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }

  normA = Math.sqrt(normA)
  normB = Math.sqrt(normB)

  if (normA === 0 || normB === 0) {
    return 0
  }

  return dotProduct / (normA * normB)
}

/**
 * Generate embedding for a query
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  try {
    const model = await initializeEmbedder()
    const output = await model(query, { pooling: "mean", normalize: true })
    return Array.from(output.data)
  } catch (error) {
    console.error("❌ Error generating query embedding:", error)
    throw new Error("Failed to generate embedding for query")
  }
}

/**
 * Find most similar chunks to a query
 */
export async function findSimilarChunks(
  query: string,
  chunks: TextChunk[],
  topK = 5,
  maxTokens = 3000,
): Promise<{
  similarChunks: (TextChunk & { similarity: number })[]
  queryEmbedding: number[]
  totalTokens: number
}> {
  console.log(`🔍 Starting similarity search for: "${query.substring(0, 100)}..."`)
  console.log(`📊 Input chunks: ${chunks.length}`)

  try {
    // Filter chunks that have embeddings
    const chunksWithEmbeddings = chunks.filter((chunk) => chunk.embedding && chunk.embedding.length > 0)

    console.log(`📋 Chunks with embeddings: ${chunksWithEmbeddings.length}`)

    if (chunksWithEmbeddings.length === 0) {
      console.warn("⚠️ No chunks with embeddings found, falling back to text search")
      const textResults = searchChunksByText(query, chunks, topK)
      console.log(`📝 Text search results: ${textResults.length} chunks`)
      return {
        similarChunks: textResults,
        queryEmbedding: [],
        totalTokens: textResults.reduce((sum, chunk) => sum + (chunk.tokenCount || 0), 0),
      }
    }

    // Generate embedding for the query
    console.log(`🔍 Generating query embedding...`)
    const queryEmbedding = await generateQueryEmbedding(query)
    console.log(`✅ Query embedding generated: ${queryEmbedding.length} dimensions`)

    // Calculate similarities
    console.log(`🧮 Calculating similarities for ${chunksWithEmbeddings.length} chunks...`)
    const similarities = chunksWithEmbeddings.map((chunk, index) => {
      const similarity = cosineSimilarity(queryEmbedding, chunk.embedding!)
      console.log(`  Chunk ${index + 1}: "${chunk.title}" - Similarity: ${similarity.toFixed(3)}`)
      return {
        ...chunk,
        similarity,
      }
    })

    // Sort by similarity (highest first)
    similarities.sort((a, b) => b.similarity - a.similarity)
    console.log(
      `📊 Top similarities: ${similarities
        .slice(0, 5)
        .map((c) => c.similarity.toFixed(3))
        .join(", ")}`,
    )

    // Select top chunks within token limit
    const selectedChunks: (TextChunk & { similarity: number })[] = []
    let totalTokens = 0

    for (let i = 0; i < Math.min(topK, similarities.length); i++) {
      const chunk = similarities[i]
      const chunkTokens = chunk.tokenCount || 0

      if (totalTokens + chunkTokens <= maxTokens) {
        selectedChunks.push(chunk)
        totalTokens += chunkTokens
        console.log(
          `✅ Selected chunk ${i + 1}: "${chunk.title}" (${chunkTokens} tokens, similarity: ${chunk.similarity.toFixed(3)})`,
        )
      } else if (selectedChunks.length === 0) {
        // Include at least one chunk even if it exceeds limit
        selectedChunks.push(chunk)
        totalTokens += chunkTokens
        console.log(
          `⚠️ Selected oversized chunk: "${chunk.title}" (${chunkTokens} tokens, similarity: ${chunk.similarity.toFixed(3)})`,
        )
        break
      } else {
        console.log(`⏭️ Skipped chunk ${i + 1}: "${chunk.title}" (would exceed token limit)`)
        break
      }
    }

    console.log(
      `📊 Final selection: ${selectedChunks.length} chunks, ${totalTokens} tokens, similarities: ${selectedChunks
        .map((c) => c.similarity.toFixed(3))
        .join(", ")}`,
    )

    return {
      similarChunks: selectedChunks,
      queryEmbedding,
      totalTokens,
    }
  } catch (error) {
    console.error("❌ Error in vector search, falling back to text search:", error)
    // Fallback to text search if vector search fails
    const textResults = searchChunksByText(query, chunks, topK)
    console.log(`📝 Fallback text search results: ${textResults.length} chunks`)
    return {
      similarChunks: textResults,
      queryEmbedding: [],
      totalTokens: textResults.reduce((sum, chunk) => sum + (chunk.tokenCount || 0), 0),
    }
  }
}

/**
 * Search chunks by text similarity (fallback when no embeddings)
 */
export function searchChunksByText(
  query: string,
  chunks: TextChunk[],
  topK = 5,
): (TextChunk & { similarity: number })[] {
  console.log(`📝 Performing text-based search for: "${query.substring(0, 50)}..."`)

  const queryLower = query.toLowerCase()
  const queryWords = queryLower.split(/\s+/).filter((word) => word.length > 2)

  console.log(`🔍 Query words: ${queryWords.join(", ")}`)

  const similarities = chunks.map((chunk, index) => {
    const chunkLower = chunk.text.toLowerCase()
    let score = 0

    // Simple text matching score
    queryWords.forEach((word) => {
      const matches = (chunkLower.match(new RegExp(word, "g")) || []).length
      score += matches
    })

    // Normalize by chunk length
    const similarity = score / Math.max(chunk.text.length / 100, 1)

    if (score > 0) {
      console.log(`  Text match ${index + 1}: "${chunk.title}" - Score: ${score}, Similarity: ${similarity.toFixed(3)}`)
    }

    return {
      ...chunk,
      similarity,
    }
  })

  const results = similarities.sort((a, b) => b.similarity - a.similarity).slice(0, topK)
  console.log(
    `📝 Text search selected ${results.length} chunks with scores: ${results.map((r) => r.similarity.toFixed(3)).join(", ")}`,
  )

  return results
}
