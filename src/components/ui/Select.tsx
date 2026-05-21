"use client"

import { useState, useRef, useEffect, type ReactNode } from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export type SelectOption = { value: string; label: string }

type SelectProps = {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  label?: string
  error?: string
  disabled?: boolean
  className?: string
}

export function Select({
  value,
  onChange,
  options,
  placeholder = "Pilih...",
  label,
  error,
  disabled,
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [open])

  useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => o.value === value)
      setActiveIdx(idx >= 0 ? idx : 0)
    }
  }, [open])

  useEffect(() => {
    if (open && activeIdx >= 0 && listRef.current) {
      const el = listRef.current.children[activeIdx] as HTMLElement
      el?.scrollIntoView({ block: "nearest" })
    }
  }, [activeIdx, open])

  function handleKey(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    if (e.key === "Escape") {
      setOpen(false)
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, options.length - 1))
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      if (activeIdx >= 0 && options[activeIdx]) {
        onChange(options[activeIdx].value)
        setOpen(false)
      }
    }
  }

  return (
    <div className={cn("w-full", className)} ref={ref}>
      {label && <label className="text-sm font-semibold text-gray-700 block mb-1.5">{label}</label>}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((v) => !v)}
          onKeyDown={handleKey}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            "w-full flex items-center justify-between gap-2 border rounded-lg px-3.5 py-2.5 text-sm bg-white text-left",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors",
            open
              ? "border-indigo-500 ring-2 ring-indigo-500"
              : "border-gray-300 hover:border-gray-400",
            error && "border-red-400",
            disabled && "opacity-50 cursor-not-allowed bg-gray-50",
          )}
        >
          <span className={cn("truncate", !selected && "text-gray-400")}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown
            size={15}
            className={cn(
              "shrink-0 text-gray-400 transition-transform duration-150",
              open && "rotate-180",
            )}
          />
        </button>

        {open && (
          <div
            role="listbox"
            ref={listRef}
            className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-auto max-h-56 py-1"
          >
            {options.map((opt, i) => (
              <div
                key={opt.value}
                role="option"
                aria-selected={opt.value === value}
                onMouseDown={(e) => {
                  e.preventDefault()
                  onChange(opt.value)
                  setOpen(false)
                }}
                onMouseEnter={() => setActiveIdx(i)}
                className={cn(
                  "flex items-center justify-between gap-2 px-3.5 py-2 text-sm cursor-pointer transition-colors",
                  i === activeIdx
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-800 hover:bg-gray-50",
                  opt.value === value && "font-semibold",
                )}
              >
                <span>{opt.label}</span>
                {opt.value === value && <Check size={13} className="shrink-0 text-indigo-500" />}
              </div>
            ))}
            {options.length === 0 && (
              <div className="px-3.5 py-2 text-sm text-gray-400 italic">Tidak ada pilihan</div>
            )}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
