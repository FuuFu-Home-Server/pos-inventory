"use client"

import { Button } from "./Button"

interface PaginationProps {
  page: number
  total: number
  pageSize: number
  onPageChange: (p: number) => void
  onPageSizeChange: (s: number) => void
  pageSizeOptions?: number[]
}

const DEFAULT_SIZES = [10, 20, 50, 100]

export function Pagination({
  page,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_SIZES,
}: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize) || 1
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500 mt-4 pt-3 border-t border-gray-100">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Baris/hal.</span>
        <div className="flex gap-1">
          {pageSizeOptions.map((s) => (
            <button
              key={s}
              onClick={() => {
                onPageSizeChange(s)
                onPageChange(1)
              }}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                s === pageSize ? "bg-indigo-100 text-indigo-700" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <span className="text-xs tabular-nums text-gray-400">
        {from}–{to} dari {total.toLocaleString("id-ID")} data
      </span>

      <div className="flex items-center gap-1">
        <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => onPageChange(1)}>
          «
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          ‹
        </Button>
        <span className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg tabular-nums min-w-[72px] text-center">
          {page} / {totalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          ›
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
        >
          »
        </Button>
      </div>
    </div>
  )
}
