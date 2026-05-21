"use client"

import { useEffect, useRef } from "react"

interface BarcodeListenerProps {
  onScan: (barcode: string) => void
  active?: boolean
}

export function BarcodeListener({ onScan, active = true }: BarcodeListenerProps) {
  const buffer = useRef("")
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!active) return

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return

      if (e.key === "Enter" || e.key === "Tab") {
        if (buffer.current.length >= 4) {
          onScan(buffer.current.trim())
        }
        buffer.current = ""
        clearTimeout(timer.current)
        return
      }

      if (e.key.length === 1) {
        buffer.current += e.key
        clearTimeout(timer.current)
        timer.current = setTimeout(() => { buffer.current = "" }, 50)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onScan, active])

  return null
}
