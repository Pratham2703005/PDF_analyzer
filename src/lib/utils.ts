"use client"

// Tailwind + utility function to join classNames
export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ")
}

// Copy-to-clipboard utility
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false

  // Clipboard API available
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  }

  // Fallback for older browsers
  try {
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    textarea.select()
    const success = document.execCommand("copy")
    document.body.removeChild(textarea)
    return success
  } catch {
    return false
  }
}
