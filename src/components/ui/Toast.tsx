"use client"

import { useEffect } from "react"
import { cn } from "@/lib/utils"

type ToastType = "success" | "error" | "info"

interface ToastProps {
  message: string
  type?: ToastType
  onDismiss: () => void
  duration?: number
}

const styles: Record<ToastType, string> = {
  success: "bg-green-600 text-white",
  error: "bg-red-600 text-white",
  info: "bg-blue-600 text-white",
}

export function Toast({ message, type = "info", onDismiss, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration)
    return () => clearTimeout(t)
  }, [onDismiss, duration])

  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium max-w-sm",
        styles[type],
      )}
    >
      {message}
    </div>
  )
}
