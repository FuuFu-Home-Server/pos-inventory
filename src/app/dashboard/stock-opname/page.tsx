"use client"

import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"
import { Table, Tbody, Td, Th, Thead } from "@/components/ui/Table"
import { formatDate } from "@/lib/format"
import { ChevronLeft, ChevronRight, ClipboardPaste, Search } from "lucide-react"
import { useRef, useState } from "react"
import { useStockOpname } from "./useStockOpname"

type ServerMatch = {
  itemId: number
  qty: number
  productName: string
  variantName: string
  unit: string
}
type ServerPasteResult = { matched: ServerMatch[]; unmatched: string[] }

function parsePasteLines(text: string): { name: string; qty: number }[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  const result: { name: string; qty: number }[] = []
  for (const line of lines) {
    const parts = line.split(/\t|;|,(?=\s*\d+\s*$)/)
    if (parts.length < 2) continue
    const qty = parseInt(parts[parts.length - 1].trim(), 10)
    const name = parts
      .slice(0, parts.length - 1)
      .join(" ")
      .trim()
    if (!isNaN(qty) && qty >= 0 && name) result.push({ name, qty })
  }
  return result
}

export default function StockOpnamePage() {
  const {
    opnames,
    meta,
    setMeta,
    items,
    total,
    page,
    PAGE_LIMIT,
    loading,
    listLoading,
    itemsLoading,
    saving,
    handleCreate,
    openDetail,
    handleSaveAll,
    handleSetAll,
    handleMatchPaste,
    applyPasteMatches,
    handleConfirm,
    localQtys,
    setLocalQty,
    search,
    handleSearchChange,
    handlePageChange,
    changedCount,
  } = useStockOpname()

  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({})
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState("")
  const [pasteResult, setPasteResult] = useState<ServerPasteResult | null>(null)
  const [pasteLoading, setPasteLoading] = useState(false)
  const [setAllVal, setSetAllVal] = useState("")
  const [setAllLoading, setSetAllLoading] = useState(false)

  async function handleSetAllClick() {
    const qty = parseInt(setAllVal, 10)
    if (isNaN(qty) || qty < 0) return
    setSetAllLoading(true)
    await handleSetAll(qty)
    setSetAllLoading(false)
    setSetAllVal("")
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, currentId: number) {
    if (e.key !== "Enter" && e.key !== "ArrowDown" && e.key !== "ArrowUp") return
    e.preventDefault()
    const ids = items.map((i) => i.id)
    const idx = ids.indexOf(currentId)
    const next = e.key === "ArrowUp" ? ids[idx - 1] : ids[idx + 1]
    if (next != null) inputRefs.current[next]?.focus()
  }

  async function handlePastePreview() {
    if (!pasteText.trim()) return
    const lines = parsePasteLines(pasteText)
    if (lines.length === 0) return
    setPasteLoading(true)
    const result = await handleMatchPaste(lines)
    if (result) setPasteResult(result)
    setPasteLoading(false)
  }

  function handlePasteApply() {
    if (!pasteResult) return
    applyPasteMatches(pasteResult.matched)
    setPasteOpen(false)
    setPasteText("")
    setPasteResult(null)
  }

  const totalPages = Math.ceil(total / PAGE_LIMIT)

  if (meta) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
          <div>
            <button
              onClick={() => setMeta(null)}
              className="text-sm text-blue-600 hover:underline mb-1"
            >
              ← Kembali
            </button>
            <h1 className="text-xl font-bold md:text-2xl text-gray-900">
              Detail Opname #{meta.id}
            </h1>
            <p className="text-sm text-gray-500">
              {meta.user.name} · {formatDate(meta.createdAt)}
            </p>
          </div>
          {meta.status === "DRAFT" && (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setPasteOpen(true)
                  setPasteResult(null)
                  setPasteText("")
                }}
              >
                <ClipboardPaste size={14} className="mr-1.5" />
                Tempel Data
              </Button>
              <Button
                variant="secondary"
                onClick={handleSaveAll}
                loading={saving}
                disabled={changedCount === 0}
              >
                Simpan{changedCount > 0 ? ` (${changedCount})` : ""}
              </Button>
              <Button
                onClick={handleConfirm}
                loading={saving}
                className="bg-green-600 hover:bg-green-700"
              >
                Konfirmasi & Update Stok
              </Button>
            </div>
          )}
        </div>

        <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Cari produk atau varian..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {meta.status === "DRAFT" && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-sm text-gray-500 whitespace-nowrap">
                Set {search ? "hasil" : "semua"} ke
              </span>
              <input
                type="number"
                min={0}
                value={setAllVal}
                onChange={(e) => setSetAllVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSetAllClick()
                }}
                placeholder="0"
                className="w-20 border border-gray-300 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Button
                variant="secondary"
                onClick={handleSetAllClick}
                loading={setAllLoading}
                disabled={setAllVal === ""}
              >
                Terapkan
              </Button>
            </div>
          )}
        </div>

        {itemsLoading ? (
          <div className="flex justify-center items-center py-16 text-gray-400 text-sm">
            Memuat...
          </div>
        ) : (
          <>
            <Table>
              <Thead>
                <tr>
                  <Th>Produk</Th>
                  <Th>Varian</Th>
                  <Th className="text-right">Stok Sistem</Th>
                  <Th className="text-right">Stok Fisik</Th>
                  <Th className="text-right">Selisih</Th>
                </tr>
              </Thead>
              <Tbody>
                {items.map((item) => {
                  const localQty = localQtys[item.id] ?? item.physicalQty
                  const diff = localQty - item.systemQty
                  const changed = localQty !== item.physicalQty
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-gray-50 ${changed ? "bg-amber-50/60" : ""}`}
                    >
                      <Td className="font-medium">{item.productVariant.product.name}</Td>
                      <Td className="text-gray-500">{item.productVariant.variantName}</Td>
                      <Td className="text-right">
                        {item.systemQty} {item.productVariant.unit}
                      </Td>
                      <Td className="text-right">
                        {meta.status === "DRAFT" ? (
                          <input
                            ref={(el) => {
                              inputRefs.current[item.id] = el
                            }}
                            type="number"
                            value={localQty}
                            min={0}
                            onChange={(e) => setLocalQty(item.id, Number(e.target.value))}
                            onKeyDown={(e) => handleKeyDown(e, item.id)}
                            className={`w-24 text-right border rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${changed ? "border-amber-400 bg-amber-50" : "border-gray-300"}`}
                          />
                        ) : (
                          <span>
                            {item.physicalQty} {item.productVariant.unit}
                          </span>
                        )}
                      </Td>
                      <Td
                        className={`text-right font-semibold ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-gray-400"}`}
                      >
                        {diff > 0 ? `+${diff}` : diff}
                      </Td>
                    </tr>
                  )
                })}
                {items.length === 0 && (
                  <tr>
                    <Td colSpan={5} className="text-center py-10 text-gray-400">
                      Tidak ada hasil
                    </Td>
                  </tr>
                )}
              </Tbody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                <span>
                  {total} item · halaman {page} dari {totalPages}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                    className="p-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        <Modal open={pasteOpen} onClose={() => {}} title="Tempel Data Stok" className="max-w-2xl">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-2">
                Tempel teks dari spreadsheet/notepad. Format per baris:{" "}
                <code className="bg-gray-100 px-1 rounded">Nama Produk[tab]Jumlah</code> atau{" "}
                <code className="bg-gray-100 px-1 rounded">Nama Produk,Jumlah</code>
              </p>
              <textarea
                value={pasteText}
                onChange={(e) => {
                  setPasteText(e.target.value)
                  setPasteResult(null)
                }}
                placeholder={"ABC SARDINES SAUS TOMAT\t25\nABC SARI KACANG HIJAU 200ML\t10\n..."}
                rows={8}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {pasteResult && (
              <div className="space-y-2 text-sm max-h-64 overflow-y-auto">
                {pasteResult.matched.length > 0 && (
                  <div>
                    <p className="font-semibold text-emerald-700 mb-1">
                      {pasteResult.matched.length} cocok:
                    </p>
                    <div className="space-y-0.5">
                      {pasteResult.matched.map((m, i) => (
                        <div
                          key={i}
                          className="flex justify-between bg-emerald-50 border border-emerald-100 rounded px-3 py-1.5 text-xs"
                        >
                          <span className="text-gray-700">
                            {m.productName} <span className="text-gray-400">{m.variantName}</span>
                          </span>
                          <span className="font-bold text-emerald-700">
                            {m.qty} {m.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {pasteResult.unmatched.length > 0 && (
                  <div>
                    <p className="font-semibold text-red-600 mb-1">
                      {pasteResult.unmatched.length} tidak cocok:
                    </p>
                    <div className="space-y-0.5">
                      {pasteResult.unmatched.map((raw, i) => (
                        <div
                          key={i}
                          className="bg-red-50 border border-red-100 rounded px-3 py-1.5 text-xs text-red-600 font-mono"
                        >
                          {raw}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setPasteOpen(false)
                  setPasteText("")
                  setPasteResult(null)
                }}
                className="flex-1"
              >
                Batal
              </Button>
              {!pasteResult ? (
                <Button
                  onClick={handlePastePreview}
                  loading={pasteLoading}
                  disabled={!pasteText.trim()}
                  className="flex-1"
                >
                  Pratinjau
                </Button>
              ) : (
                <Button
                  onClick={handlePasteApply}
                  disabled={pasteResult.matched.length === 0}
                  className="flex-1"
                >
                  Terapkan {pasteResult.matched.length} item
                </Button>
              )}
            </div>
          </div>
        </Modal>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
        <h1 className="text-xl font-bold md:text-2xl text-gray-900">Stock Opname</h1>
        <Button onClick={handleCreate} loading={loading}>
          + Buat Opname Baru
        </Button>
      </div>
      <Table>
        <Thead>
          <tr>
            <Th>ID</Th>
            <Th>Dibuat oleh</Th>
            <Th>Tanggal</Th>
            <Th>Item</Th>
            <Th>Status</Th>
            <Th />
          </tr>
        </Thead>
        <Tbody>
          {listLoading && (
            <tr>
              <Td colSpan={6} className="py-10 text-center">
                <div className="inline-flex items-center gap-2 text-gray-400 text-sm">
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  Memuat...
                </div>
              </Td>
            </tr>
          )}
          {!listLoading && opnames.length === 0 && (
            <tr>
              <Td colSpan={6} className="py-10 text-center text-gray-400">
                Belum ada stock opname
              </Td>
            </tr>
          )}
          {opnames.map((o) => (
            <tr key={o.id} className="hover:bg-gray-50">
              <Td className="font-mono text-xs">#{o.id}</Td>
              <Td className="text-gray-500 text-xs">{o.user.name}</Td>
              <Td className="text-gray-500 text-xs">{formatDate(o.createdAt)}</Td>
              <Td className="text-gray-500">{o._count.items} varian</Td>
              <Td>
                <Badge variant={o.status === "CONFIRMED" ? "success" : "warning"}>
                  {o.status === "CONFIRMED" ? "Dikonfirmasi" : "Draf"}
                </Badge>
              </Td>
              <Td>
                <Button
                  variant="secondary"
                  className="text-xs py-1 px-2"
                  onClick={() => openDetail(o.id)}
                >
                  Detail
                </Button>
              </Td>
            </tr>
          ))}
        </Tbody>
      </Table>
    </div>
  )
}
