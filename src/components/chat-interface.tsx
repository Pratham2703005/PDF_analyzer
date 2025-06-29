"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Send, Loader2, MessageSquare, FileText, ChevronDown, ChevronUp, Copy, User, Bot, AlertCircle, Wifi } from "lucide-react"

// Mock types for demonstration
interface TextChunk {
  id: string
  text: string
  title: string
  pageNumber: number
  similarity?: number
  embedding?: number[]
}

interface ConversationMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  tokenCount: number
  chunks?: TextChunk[]
}

interface ChatInterfaceProps {
  chunks: TextChunk[]
  onSendMessage: (message: string) => Promise<void>
  isLoading: boolean
  error: string
  messages: ConversationMessage[]
}

// Collapsible Sources Component
function Sources({ chunks }: { chunks: TextChunk[] }) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  if (!chunks || chunks.length === 0) return null
  
  return (
    <div className="mt-3 border-t pt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
      >
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        <span>{chunks.length} source{chunks.length > 1 ? 's' : ''}</span>
      </button>
      
      {isExpanded && (
        <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
          {chunks.map((chunk) => (
            <div key={chunk.id} className="p-2 bg-gray-50 rounded border text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium truncate">{chunk.title}</span>
                <div className="flex gap-1 ml-2">
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    p.{chunk.pageNumber}
                  </Badge>
                  {chunk.similarity && (
                    <Badge variant="secondary" className="text-xs px-1 py-0">
                      {(chunk.similarity * 100).toFixed(0)}%
                    </Badge>
                  )}
                </div>
              </div>
              <p className="text-gray-600 line-clamp-2">
                {chunk.text.substring(0, 120)}...
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Message Component
function Message({ message, onCopy }: { message: ConversationMessage; onCopy: (text: string) => void }) {
  const isUser = message.role === "user"
  
  return (
    <div className={`group flex gap-3 py-4 ${isUser ? 'bg-transparent' : 'bg-gray-50/50'}`}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gray-100">
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="prose prose-sm max-w-none">
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
            {message.content}
          </div>
        </div>
        
        {!isUser && <Sources chunks={message.chunks || []} />}
        
        <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onCopy(message.content)}
            className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700"
          >
            <Copy className="h-3 w-3" />
          </button>
          <span className="text-xs text-gray-400">
            {message.timestamp.toLocaleTimeString()} • {message.tokenCount} tokens
          </span>
        </div>
      </div>
    </div>
  )
}

export function ChatInterface({ chunks, onSendMessage, isLoading, error, messages }: ChatInterfaceProps) {
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    
    const message = input.trim()
    setInput("")

    try {
      await onSendMessage(message)
    } finally {
      inputRef.current?.focus()
    }
  }

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (chunks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 p-6">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-lg mb-1">No document loaded</p>
          <p className="text-sm text-gray-400">Upload and process a PDF to start chatting</p>
        </div>
      </div>
    )
  }

  const chunksWithEmbeddings = chunks.filter(chunk => chunk.embedding&& chunk.embedding?.length > 0)

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Minimal Header */}
      <div className="px-4 py-3 border-b bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-800">Document Chat</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {chunks.length} chunks
            </span>
            {chunksWithEmbeddings.length > 0 && (
              <span className="flex items-center gap-1">
                <Wifi className="h-3 w-3" />
                {chunksWithEmbeddings.length} embedded
              </span>
            )}
          </div>
        </div>
        
        {chunksWithEmbeddings.length === 0 && (
          <Alert className="mt-2 py-2">
            <AlertCircle className="h-3 w-3" />
            <AlertDescription className="text-xs">
              Using text search - embeddings loading
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Messages - Fixed height with scroll */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center py-12">
                <Bot className="h-8 w-8 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-600 mb-1">Ready to help!</p>
                <p className="text-sm text-gray-400">
                  Ask me anything about your document
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 px-2 max-h-[30vh]">
              {messages.map((message) => (
                <Message key={message.id} message={message} onCopy={handleCopy} />
              ))}
            </div>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3 py-4 bg-gray-50/50">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 border-t">
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Input - Fixed at bottom */}
      <div className="border-t bg-white p-4">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message..."
              disabled={isLoading}
              className="flex-1 border-gray-300 focus:border-gray-400 focus:ring-0"
              autoFocus
            />
            <Button 
              type="submit" 
              disabled={!input.trim() || isLoading}
              size="sm"
              className="px-3"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}