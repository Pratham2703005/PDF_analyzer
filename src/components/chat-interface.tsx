"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import {
  Send,
  Loader2,
  Sparkles,
  FileText,
  Copy,
  AlertCircle,
  ChevronDown,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn, copyToClipboard } from "@/lib/utils"

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

const SUGGESTED = [
  "Give me a 3-bullet TL;DR.",
  "What are the key findings?",
  "Which sections should I re-read first?",
]

function Sources({ chunks }: { chunks: TextChunk[] }) {
  if (!chunks || chunks.length === 0) return null
  return (
    <Collapsible className="mt-3">
      <CollapsibleTrigger className="group inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <FileText className="h-3 w-3" />
        {chunks.length} source{chunks.length > 1 ? "s" : ""}
        <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-1.5">
        {chunks.map((c) => (
          <div key={c.id} className="rounded-lg border bg-background/60 p-2.5 text-xs">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-medium truncate">{c.title}</span>
              <div className="flex gap-1 shrink-0">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  p.{c.pageNumber}
                </Badge>
                {typeof c.similarity === "number" && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {(c.similarity * 100).toFixed(0)}%
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-muted-foreground line-clamp-2">{c.text.substring(0, 160)}…</p>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

function MessageBubble({ message }: { message: ConversationMessage }) {
  const isUser = message.role === "user"
  return (
    <div className={cn("group flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("flex flex-col max-w-[85%]", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-muted rounded-bl-md",
          )}
        >
          {message.content}
        </div>
        {!isUser && <Sources chunks={message.chunks || []} />}
        <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => copyToClipboard(message.content)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            aria-label="Copy"
          >
            <Copy className="h-3 w-3" />
          </button>
          <span className="text-[10px] text-muted-foreground">
            {message.timestamp.toLocaleTimeString()} · {message.tokenCount}t
          </span>
        </div>
      </div>
    </div>
  )
}

export function ChatInterface({
  chunks,
  onSendMessage,
  isLoading,
  error,
  messages,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  const submit = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return
    setInput("")
    try {
      await onSendMessage(trimmed)
    } finally {
      inputRef.current?.focus()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submit(input)
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      submit(input)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto thin-scroll px-6 py-4"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium">Ask anything about this document</p>
              <p className="text-xs text-muted-foreground mt-1">
                Answers cite the passages they come from.
              </p>
              <div className="mt-5 grid gap-2">
                {SUGGESTED.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    className="rounded-lg border bg-card px-3 py-2 text-left text-xs hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-2.5 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking…
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {error && (
        <div className="mx-6 mb-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="border-t bg-background/60 backdrop-blur px-6 py-3"
      >
        <div className="relative flex items-end gap-2 rounded-2xl border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring/30 transition-shadow">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Message the document…"
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground max-h-40 py-1.5"
          />
          <Button
            type="submit"
            size="icon"
            className="rounded-full h-8 w-8 shrink-0"
            disabled={!input.trim() || isLoading}
            aria-label="Send"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground text-right">
          {chunks.length} chunks indexed · Enter to send · Shift+Enter for newline
        </p>
      </form>
    </div>
  )
}
