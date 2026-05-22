"use client"

import { useState, useRef, useEffect, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { X, Plus } from "lucide-react"
import { Modal } from "./Modal"
import { Button } from "./Button"

export type PurchaseItem = {
  variantId: number
  label: string
  unit: string
  qty: string
  unitCost: string
  qtyPerUnit?: string
}

export type VariantResult = {
  id: number
  variantName: string
  unit: string
  price: number
  costPrice: number | null
  stock: number
  product: { name: string }
}

export type QuickProductForm = {
  name: string
  category: string
  variantName: string
  unit: string
  costPrice: number
}

interface PurchaseModalProps {
  open: boolean
  onClose: () => void
  title: string
  className?: string
  headerSlot: ReactNode
  items: PurchaseItem[]
  onItemsChange: (items: PurchaseItem[]) => void
  showQtyPerUnit?: boolean
  searchVariants: (q: string) => Promise<VariantResult[]>
  onAddVariant: (v: VariantResult) => void
  onSubmit: () => void
  loading: boolean
  submitLabel: string
  submitDisabled: boolean
  onCreateProduct?: (data: QuickProductForm) => Promise<VariantResult | null>
}

export function PurchaseModal({
  open,
  onClose,
  title,
  className,
  headerSlot,
  items,
  onItemsChange,
  showQtyPerUnit = false,
  searchVariants,
  onAddVariant,
  onSubmit,
  loading,
  submitLabel,
  submitDisabled,
  onCreateProduct,
}: PurchaseModalProps) {
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<VariantResult[]>([])
  const [dropOpen, setDropOpen] = useState(false)
  const [dropRect, setDropRect] = useState<DOMRect | null>(null)
  const [showNewProduct, setShowNewProduct] = useState(false)
  const [newProductForm, setNewProductForm] = useState<QuickProductForm>({
    name: "",
    category: "",
    variantName: "",
    unit: "pcs",
    costPrice: 0,
  })
  const [creatingProduct, setCreatingProduct] = useState(false)

  useEffect(() => {
    if (!open) {
      setShowNewProduct(false)
      setNewProductForm({ name: "", category: "", variantName: "", unit: "pcs", costPrice: 0 })
    }
  }, [open])

  async function handleCreateProduct() {
    if (!onCreateProduct || !newProductForm.name) return
    setCreatingProduct(true)
    const result = await onCreateProduct(newProductForm)
    setCreatingProduct(false)
    if (result) {
      onAddVariant(result)
      setShowNewProduct(false)
      setNewProductForm({ name: "", category: "", variantName: "", unit: "pcs", costPrice: 0 })
    }
  }
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!dropOpen) return
    function handleMouseDown(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropOpen(false)
      }
    }
    document.addEventListener("mousedown", handleMouseDown)
    return () => document.removeEventListener("mousedown", handleMouseDown)
  }, [dropOpen])

  function updateDropRect() {
    if (inputRef.current) setDropRect(inputRef.current.getBoundingClientRect())
  }

  async function doSearch(q: string) {
    updateDropRect()
    const data = await searchVariants(q)
    setResults(data)
    if (data.length > 0) setDropOpen(true)
  }

  function handleSearchChange(q: string) {
    setSearch(q)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => doSearch(q), 150)
  }

  function handleFocus() {
    updateDropRect()
    doSearch(search)
  }

  function handleSelectVariant(v: VariantResult) {
    onAddVariant(v)
    setSearch("")
    setResults([])
    setDropOpen(false)
  }

  function updateItem(i: number, patch: Partial<PurchaseItem>) {
    const next = items.map((item, idx) => (idx === i ? { ...item, ...patch } : item))
    onItemsChange(next)
  }

  function removeItem(i: number) {
    onItemsChange(items.filter((_, idx) => idx !== i))
  }

  const fieldCls =
    "border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"

  return (
    <Modal open={open} onClose={onClose} title={title} className={className ?? "max-w-2xl"}>
      <div className="space-y-4">
        {headerSlot}

        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Cari Produk</p>
          <div ref={searchRef}>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={handleFocus}
              placeholder="Ketik atau klik untuk pilih produk..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {dropOpen &&
            dropRect &&
            typeof document !== "undefined" &&
            createPortal(
              <div
                style={{
                  position: "fixed",
                  top: dropRect.bottom + 4,
                  left: dropRect.left,
                  width: dropRect.width,
                  zIndex: 9999,
                }}
                className="bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto"
              >
                {results.map((v) => (
                  <button
                    key={v.id}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleSelectVariant(v)
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 flex items-center justify-between text-sm transition-colors border-b border-gray-50 last:border-0"
                  >
                    <span className="font-medium text-gray-800">
                      {v.product.name} <span className="text-gray-500">{v.variantName}</span>
                    </span>
                    <span className="text-xs text-gray-400">
                      Stok: {v.stock} {v.unit}
                    </span>
                  </button>
                ))}
              </div>,
              document.body,
            )}

          {onCreateProduct && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowNewProduct((v) => !v)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <Plus size={12} />
                {showNewProduct ? "Batal" : "Produk Baru"}
              </button>

              {showNewProduct && (
                <div className="mt-2 p-3 border border-indigo-100 rounded-xl bg-indigo-50 space-y-2">
                  <input
                    placeholder="Nama produk *"
                    value={newProductForm.name}
                    onChange={(e) => setNewProductForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="Kategori"
                      value={newProductForm.category}
                      onChange={(e) =>
                        setNewProductForm((f) => ({ ...f, category: e.target.value }))
                      }
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <input
                      placeholder="Nama varian (opsional)"
                      value={newProductForm.variantName}
                      onChange={(e) =>
                        setNewProductForm((f) => ({ ...f, variantName: e.target.value }))
                      }
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <input
                      placeholder="Satuan (pcs)"
                      value={newProductForm.unit}
                      onChange={(e) => setNewProductForm((f) => ({ ...f, unit: e.target.value }))}
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <input
                      type="number"
                      placeholder="Harga beli"
                      value={newProductForm.costPrice || ""}
                      onChange={(e) =>
                        setNewProductForm((f) => ({ ...f, costPrice: Number(e.target.value) }))
                      }
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateProduct}
                    disabled={!newProductForm.name || creatingProduct}
                    className="text-xs font-bold bg-indigo-600 text-white rounded-lg px-3 py-1.5 hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                  >
                    {creatingProduct ? "Menyimpan..." : "Simpan & Tambah ke Daftar"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Item ({items.length})</p>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {items.map((item, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0 text-sm text-gray-700 truncate bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                      {item.label}
                    </div>
                    <button
                      onClick={() => removeItem(i)}
                      className="text-gray-400 hover:text-red-500 flex items-center justify-center w-7 shrink-0"
                    >
                      <X size={15} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.qty}
                      onChange={(e) => updateItem(i, { qty: e.target.value })}
                      className={`${fieldCls} w-16 text-center shrink-0`}
                    />
                    <span className="text-xs font-medium text-gray-500 shrink-0 px-1">
                      {item.unit}
                    </span>
                    {showQtyPerUnit && (
                      <>
                        <span className="text-gray-400 text-xs shrink-0">×</span>
                        <input
                          type="number"
                          placeholder="isi"
                          value={item.qtyPerUnit ?? "1"}
                          onChange={(e) => updateItem(i, { qtyPerUnit: e.target.value })}
                          className={`${fieldCls} w-16 text-center shrink-0`}
                        />
                        <span className="text-gray-400 text-xs shrink-0">pcs</span>
                      </>
                    )}
                    <input
                      type="number"
                      placeholder="Harga"
                      value={item.unitCost}
                      onChange={(e) => updateItem(i, { unitCost: e.target.value })}
                      className={`${fieldCls} flex-1 min-w-0`}
                    />
                  </div>
                  {showQtyPerUnit && Number(item.qtyPerUnit) > 1 && (
                    <p className="text-[10px] text-indigo-600 font-medium pl-0.5">
                      = {Number(item.qty) * Number(item.qtyPerUnit)} {item.unit} total
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <Button onClick={onSubmit} loading={loading} disabled={submitDisabled} className="w-full">
          {submitLabel}
        </Button>
      </div>
    </Modal>
  )
}
