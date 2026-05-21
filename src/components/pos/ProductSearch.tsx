"use client"

import { useState, useCallback, useRef } from "react"
import { Input } from "@/components/ui/Input"
import { formatRupiah } from "@/lib/format"

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
  onSelect: (item: SearchResult, allResults: SearchResult[]) => void
}

export function ProductSearch({ onSelect }: ProductSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return }
    const res = await fetch(`/api/variants/search?q=${encodeURIComponent(q)}`)
    if (res.ok) {
      const data = await res.json()
      setResults(data)
      setOpen(data.length > 0)
    }
  }, [])

  function handleChange(val: string) {
    setQuery(val)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => search(val), 300)
  }

  function handleSelect(item: SearchResult) {
    onSelect(item, results)
    setQuery("")
    setResults([])
    setOpen(false)
  }

  return (
    <div className="relative">
      <Input
        placeholder="Cari produk atau scan barcode manual..."
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        className="text-base"
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-20 top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
          {results.map((item) => (
            <button
              key={item.id}
              className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex justify-between items-center border-b last:border-0"
              onClick={() => handleSelect(item)}
            >
              <span className="text-sm font-medium text-gray-900">
                {item.productName} <span className="text-gray-500 font-normal">— {item.variantName}</span>
              </span>
              <span className="text-sm font-semibold text-blue-700 ml-2 shrink-0">
                {formatRupiah(item.price)} / {item.unit}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
