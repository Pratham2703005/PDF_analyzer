"use client"

import * as React from "react"
import {
  FileUp,
  RefreshCw,
  Sparkles,
  Trash2,
  MoreVertical,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type Confirm = { title: string; description: string; action: () => void } | null

export function DocumentActionsMenu({
  disabled,
  onUpload,
  onReprocess,
  onRegenerateSummary,
  onClear,
  trigger,
}: {
  disabled?: boolean
  onUpload: (file: File) => void
  onReprocess: () => void
  onRegenerateSummary: () => void
  onClear: () => void
  trigger?: React.ReactNode
}) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const [confirm, setConfirm] = React.useState<Confirm>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onUpload(file)
    e.target.value = ""
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {trigger ?? (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              aria-label="Document actions"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>Document</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
            <FileUp /> Upload new PDF
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={disabled}
            onSelect={(e) => {
              e.preventDefault()
              setConfirm({
                title: "Reprocess this PDF?",
                description:
                  "This re-runs extraction, chunking, summarization and embeddings. Chat will be temporarily disabled.",
                action: onReprocess,
              })
            }}
          >
            <RefreshCw /> Reprocess current PDF
          </DropdownMenuItem>
          <DropdownMenuItem disabled={disabled} onSelect={onRegenerateSummary}>
            <Sparkles /> Regenerate summary only
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={(e) => {
              e.preventDefault()
              setConfirm({
                title: "Clear document?",
                description: "Removes the loaded PDF and resets the workspace.",
                action: onClear,
              })
            }}
          >
            <Trash2 /> Clear document
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirm?.action()
                setConfirm(null)
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
