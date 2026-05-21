"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { formatRupiah } from "@/lib/format"
import { Search, Package, AlertCircle } from "lucide-react"

type SearchResult = {
  id: number
  productId: number
  productName: string
  variantName: string
  price: number
  stock: number
  unit: string
  barcode: string | null
}

interface ProductSearchProps {
  onSelect: (item: SearchResult) => void
}

export function ProductSearch({ onSelect }: ProductSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [loading, setLoading] = useState(false)

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  const search = useCallback(async (q: string) => {
    setLoading(true)
    const res = await fetch(`/api/variants/search?q=${encodeURIComponent(q)}`)
    setLoading(false)
    if (res.ok) {
      const data = await res.json()
      setResults(data)
      setOpen(data.length > 0)
      setActiveIndex(-1)
    }
  }, [])

  function handleChange(val: string) {
    setQuery(val)
    clearTimeout(timer.current)
    if (val.length === 0 || val.length >= 2) {
      timer.current = setTimeout(() => search(val), val.length === 0 ? 0 : 250)
    }
  }

  function handleFocus() {
    setFocused(true)
    if (results.length === 0) search(query)
  }

  function handleSelect(item: SearchResult) {
    onSelect(item)
    setQuery("")
    setResults([])
    setOpen(false)
    setActiveIndex(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      const next = activeIndex < results.length - 1 ? activeIndex + 1 : 0
      setActiveIndex(next)
      itemRefs.current[next]?.scrollIntoView({ block: "nearest" })
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      const prev = activeIndex > 0 ? activeIndex - 1 : results.length - 1
      setActiveIndex(prev)
      itemRefs.current[prev]?.scrollIntoView({ block: "nearest" })
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (activeIndex >= 0 && results[activeIndex]) {
        handleSelect(results[activeIndex])
      }
    } else if (e.key === "Escape") {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, results.length)
  }, [results])

  const showDropdown = open && focused

  return (
    <div className="relative">
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          {loading ? (
            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Search size={16} className="text-gray-400" />
          )}
        </div>
        <input
          type="text"
          placeholder="Cari nama produk atau scan barcode..."
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={() =>
            setTimeout(() => {
              setFocused(false)
              setActiveIndex(-1)
            }, 150)
          }
          onKeyDown={handleKeyDown}
          className="w-full pl-11 pr-4 py-3 text-base border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-gray-400 transition-all"
          autoComplete="off"
          autoFocus
          data-search-input
        />
        {query && (
          <button
            onMouseDown={() => {
              setQuery("")
              setResults([])
              setOpen(false)
              setActiveIndex(-1)
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-lg leading-none"
          >
            ×
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          ref={listRef}
          className="absolute z-30 top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-2xl mt-2 overflow-hidden"
          style={{ maxHeight: "340px", overflowY: "auto" }}
        >
          <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {query.length < 2
                ? `${results.length} produk tersedia`
                : `${results.length} hasil ditemukan`}
            </span>
            <span className="text-xs text-gray-400">↑↓ navigasi · Enter pilih</span>
          </div>

          {results.map((item, i) => {
            const isActive = i === activeIndex
            const isLowStock = item.stock <= 5 && item.stock > 0
            const isOutOfStock = item.stock === 0

            return (
              <button
                key={item.id}
                ref={(el) => {
                  itemRefs.current[i] = el
                }}
                className={`w-full text-left px-4 py-3 flex items-center gap-4 border-b border-gray-50 last:border-0 transition-all duration-100 ${
                  isActive ? "bg-indigo-600 text-white" : "hover:bg-indigo-50"
                }`}
                onMouseDown={() => handleSelect(item)}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive ? "bg-indigo-500" : "bg-gray-100"
                  }`}
                >
                  <Package size={15} className={isActive ? "text-white" : "text-gray-500"} />
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-bold leading-tight truncate ${isActive ? "text-white" : "text-gray-900"}`}
                  >
                    {item.productName}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs ${isActive ? "text-indigo-200" : "text-gray-500"}`}>
                      {item.variantName}
                    </span>
                    <span className={`text-xs ${isActive ? "text-indigo-300" : "text-gray-300"}`}>
                      ·
                    </span>
                    <span
                      className={`text-xs flex items-center gap-1 ${
                        isOutOfStock
                          ? isActive
                            ? "text-red-300"
                            : "text-red-500"
                          : isLowStock
                            ? isActive
                              ? "text-amber-300"
                              : "text-amber-600"
                            : isActive
                              ? "text-indigo-200"
                              : "text-gray-500"
                      }`}
                    >
                      {isOutOfStock && <AlertCircle size={10} />}
                      {isOutOfStock ? "Stok habis" : `Stok: ${item.stock} ${item.unit}`}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p
                    className={`text-sm font-black tabular-nums ${isActive ? "text-white" : "text-indigo-600"}`}
                  >
                    {formatRupiah(item.price)}
                  </p>
                  <p className={`text-xs ${isActive ? "text-indigo-300" : "text-gray-400"}`}>
                    per {item.unit}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
