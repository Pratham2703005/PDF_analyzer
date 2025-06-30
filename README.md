# PDF Analyzer 📄🤖

**Semantic Chunking, Summarization & Chat over PDFs**

[![YouTube Demo](https://img.shields.io/badge/🎥_YouTube-Demo_Video-red?style=for-the-badge)](https://youtu.be/OTrp1WMgFxA)
[![Live Demo](https://img.shields.io/badge/🔗_Live-Demo-blue?style=for-the-badge)](https://pdf-analyzer-blond.vercel.app/)
[![Project Slides](https://img.shields.io/badge/📑_Project-Slides-green?style=for-the-badge)](https://github.com/Pratham2703005/PDF_analyzer/blob/main/public/PDF-Analyzer.pptx)

---

## 🚀 Project Introduction

PDF Analyzer is an intelligent document processing system that tackles the unsolved problem of semantic PDF chunking. Unlike traditional rule-based approaches that fail on non-standard documents, this tool combines advanced AI with smart heuristics to understand document structure, generate meaningful summaries, and enable contextual conversations with your PDFs. Built during a hackathon, it addresses a critical gap in document AI that even advanced LLMs like GPT and Claude struggle with at scale.

---

## ❌ The Unsolved Problem

Semantic PDF chunking remains one of the most challenging problems in document AI:

• **Inconsistent Formatting**: Scientific papers use varied styles - some bold titles, some ALL CAPS, some numbered sections with no universal standard

• **Visual ≠ Semantic Structure**: Multi-column layouts, figures, footnotes, and headers break traditional regex and positional logic

• **No Scalable AI Solution**: Even GPT-4 and Claude can't semantically segment entire PDFs without extensive manual prompt engineering

• **Regex Limitations**: Heuristic approaches plateau at ~50% accuracy, failing completely on non-standard document formats

• **Context Loss**: Poor chunking leads to weak AI understanding, resulting in hallucinations and irrelevant responses

• **Open Research Problem**: Despite tools like SciSpace and Semantic Scholar, no generalized open-source solution exists for arbitrary PDF chunking

---

## 💡 Project Origin & Motivation

The inspiration struck during a hackathon - not from the original problem statement, but from observing the painful inefficiencies in PDF processing workflows. Initial research revealed a glaring gap in robust semantic chunking solutions.

Early experiments with GPT-4 and regex patterns achieved only **50% coverage** across diverse document types, highlighting the core issue: **there's no universal logic that works for all PDFs**. This limitation sparked the decision to develop a custom AI system designed to understand and chunk documents based on their true structural semantics, not just surface-level patterns.

The goal: bridge the gap between rigid rule-based systems and the flexibility needed for real-world document diversity.

---

## 🏗️ Hooks Architecture

### `use-pdf-extractor`
**Purpose**: Extract and parse text content from uploaded PDF files

**State Variables**:
- `pdfJsloaded`: Boolean indicating PDF.js library load status
- `isLoading`: Loading state during PDF processing
- `error`: Error messages from parsing failures
- `fileName`: Name of the uploaded PDF file
- `extractedText`: Raw text content extracted from PDF
- `pdfDoc`: PDF document object reference
- `pdfFile`: Original PDF file object

**Functions**:
- `setError`: Manual error state management

---

### `use-text-chunker`
**Purpose**: Perform intelligent semantic chunking using regex patterns and heading detection logic

**State Variables**:
- `chunks`: Array of semantically divided text sections
- `stats`: Chunking statistics (count, average size, etc.)
- `isChunking`: Boolean indicating active chunking process

**Functions**:
- `chunkText`: Main chunking algorithm execution
- `setChunks`: Manual chunk array updates
- `setStats`: Update chunking statistics

---

### `use-embeddings`
**Purpose**: Generate vector embeddings with intelligent caching and batch processing

**State Variables**:
- `chunksWithEmbedding`: Chunks paired with their vector embeddings
- `isGenerating`: Loading state during embedding generation
- `error`: Embedding generation error messages
- `cacheInfo`: Cache hit/miss statistics and performance metrics
- `batchInfo`: Batch processing status and progress

**Functions**:
- `generateEmbeddings`: Check cache → generate missing embeddings using Xenova Transformers
- `clearEmbeddings`: Reset embedding state and clear cache

---

### `use-summarization`
**Purpose**: Generate hierarchical summaries with fallback mechanisms

**State Variables**:
- `summaries`: Array of individual chunk summaries
- `finalSummary`: Consolidated summary when multiple summaries exist
- `isGenerating`: Loading state during summarization
- `error`: Summarization error handling
- `requiresApiKey`: Boolean indicating if OpenAI API key is needed
- `stats`: Summary generation statistics and performance metrics
- `selectedMode`: Current summarization model (OpenAI/Xenova fallback)

**Functions**:
- `generateSummaries`: Batch summarize chunks → re-summarize if >1 summary exists
- `clearSummaries`: Reset all summary state
- `setSelectedModel`: Switch between OpenAI and Xenova models

---

### `use-chat`
**Purpose**: Enable contextual conversations using vector similarity search

**State Variables**:
- `messages`: Chat conversation history
- `isLoading`: Loading state during response generation
- `error`: Chat error messages and API failures

**Functions**:
- `send_message`: Process query → generate embedding → search top chunks → generate contextual response
- `clearChat`: Reset conversation history

---

## 📊 System Architecture

### Summarization & PDF Processing Flow
![Summarization Flowchart](/public/Blank%20diagram%20(2).png)

*The system processes PDFs through parsing, semantic chunking, embedding generation, and hierarchical summarization with intelligent fallbacks.*

### Interactive Chat Flow  
![Chat Flowchart](/public/Blank%20diagram%20(1).png)

*User queries are embedded, matched against document chunks via cosine similarity, and contextual responses are generated using retrieved content.*

---

## 📈 Current Status & Progress

✅ **Rules-Based Semantic Chunking**: Successfully handles 50%+ of scientific papers with reliable section identification

✅ **Functional Summarization & Chat**: Both document summarization and interactive chat features are fully operational

🚧 **AI-Based Chunking Logic**: Advanced ML model for adaptive chunking is in active development - significant progress made, integration coming soon

🎯 **Next Milestones**: 
- Deploy custom semantic chunking model
- Improve multi-column document handling
- Add support for tables and figures


## 🔧 Technologies Used

- **Frontend**: Next.js 14, React 18, TypeScript
- **AI/ML**: Xenova Transformers, OpenAI API (GPT-4)
- **PDF Processing**: PDF.js
- **Database**: Prisma ORM with PostgreSQL
- **Vector Search**: Cosine similarity with custom indexing
- **Deployment**: Vercel
- **Styling**: Tailwind CSS
- **State Management**: Custom React hooks

---

## 🤝 Contributing

Contributions are welcome! This project tackles a genuinely difficult problem in document AI. Areas where help is especially needed:

- Improving chunking accuracy for edge cases
- Adding support for more document types
- Optimizing embedding generation performance
- Building better evaluation metrics

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Pratham Israni**

Building the future of document AI, one chunk at a time.

📧 **Feedback Welcome**: Found a bug? Have a feature request? Open an issue or reach out directly!

---

<div align="center">

**⭐ Star this repo if PDF Analyzer helped you process documents more intelligently!**

*Made with ❤️ for the research and developer community*

</div>