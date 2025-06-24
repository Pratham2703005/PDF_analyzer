export interface TextChunk {
  id: string
  text: string
  pageNumber: number
  title: string
  level: number
  tokenCount: number
  wordCount: number
  embedding?: number[] // Optional embedding vector
  similarity?: number // Optional similarity score
  fromCache?: boolean // Whether embedding was loaded from cache
}

export interface ChunkingStats {
  totalChunks: number
  totalTokens: number
  averageChunkSize: number
  chunksByLevel: { [key: number]: number }
  chunksByPage: { [key: number]: number }
}

export interface PDFDocumentProxy {
  numPages: number
  getPage: (pageNumber: number) => Promise<PDFPageProxy>
  destroy: () => Promise<void>
}

export interface PDFPageProxy {
  getViewport: (arg: { scale: number }) => PDFPageViewport
  getTextContent: () => Promise<{ items: TextItem[] }>
  render: (arg: any) => any
}

export interface TextItem {
  str: string
  dir: string
  width: number
  height: number
  transform: [number, number, number, number, number, number]
  fontName: string
  hasEOL: boolean
}

export interface PDFPageViewport {
  width: number
  height: number
}
