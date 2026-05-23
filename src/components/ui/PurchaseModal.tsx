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
  productId: number
  productName: string
  variantName: string
  unit: string
  price: number
  costPrice: number | null
  stock: number
  barcode: string | null
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
  searchVariants: (q: string) => Promise<VariantResult[]>
  onAddVariant: (v: VariantResult) => void
  onSubmit: () => void
  loading: boolean
  submitLabel: string
  submitDisabled: boolean
  onCreateProduct?: (data: QuickProductForm) => Promise<VariantResult | null>
  onCreateVariant?: (
    productId: number,
    data: { variantName: string; unit: string; costPrice: number },
  ) => Promise<VariantResult | null>
}

export function PurchaseModal({
  open,
  onClose,
  title,
  className,
  headerSlot,
  items,
  onItemsChange,
  searchVariants,
  onAddVariant,
  onSubmit,
  loading,
  submitLabel,
  submitDisabled,
  onCreateProduct,
  onCreateVariant,
}: PurchaseModalProps) {
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<VariantResult[]>([])
  const [dropOpen, setDropOpen] = useState(false)
  const [dropRect, setDropRect] = useState<DOMRect | null>(null)
  const [showNewProduct, setShowNewProduct] = useState(false)
  const [showNewVariant, setShowNewVariant] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  const [newProductForm, setNewProductForm] = useState<QuickProductForm>({
    name: "",
    category: "",
    variantName: "",
    unit: "pcs",
    costPrice: 0,
  })
  const [productSearch, setProductSearch] = useState("")
  const [productResults, setProductResults] = useState<{ id: number; name: string }[]>([])
  const [selectedProduct, setSelectedProduct] = useState<{ id: number; name: string } | null>(null)
  const [newVariantForm, setNewVariantForm] = useState({
    variantName: "",
    unit: "pcs",
    costPrice: 0,
  })
  const [creatingVariant, setCreatingVariant] = useState(false)
  const [creatingProduct, setCreatingProduct] = useState(false)

  useEffect(() => {
    if (!open) {
      setShowNewProduct(false)
      setNewProductForm({ name: "", category: "", variantName: "", unit: "pcs", costPrice: 0 })
      setShowNewVariant(false)
      setProductSearch("")
      setProductResults([])
      setSelectedProduct(null)
      setNewVariantForm({ variantName: "", unit: "pcs", costPrice: 0 })
    }
  }, [open])

  useEffect(() => {
    if ((showNewProduct || showNewVariant) && categories.length === 0) {
      fetch("/api/categories")
        .then((r) => r.json())
        .then((data: { name: string }[]) => setCategories(data.map((c) => c.name)))
        .catch(() => {})
    }
  }, [showNewProduct, showNewVariant])

  useEffect(() => {
    if (!productSearch.trim()) {
      setProductResults([])
      return
    }
    const t = setTimeout(() => {
      fetch(`/api/products?q=${encodeURIComponent(productSearch)}&limit=8`)
        .then((r) => r.json())
        .then((data: { products: { id: number; name: string }[] }) =>
          setProductResults(data.products ?? []),
        )
        .catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [productSearch])

  async function handleCreateVariant() {
    if (!onCreateVariant || !selectedProduct || !newVariantForm.variantName) return
    setCreatingVariant(true)
    const result = await onCreateVariant(selectedProduct.id, newVariantForm)
    setCreatingVariant(false)
    if (result) {
      onAddVariant(result)
      setShowNewVariant(false)
      setProductSearch("")
      setProductResults([])
      setSelectedProduct(null)
      setNewVariantForm({ variantName: "", unit: "pcs", costPrice: 0 })
    }
  }

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
                      {v.productName} <span className="text-gray-500">{v.variantName}</span>
                    </span>
                    <span className="text-xs text-gray-400">
                      Stok: {v.stock} {v.unit}
                    </span>
                  </button>
                ))}
              </div>,
              document.body,
            )}

          {(onCreateProduct || onCreateVariant) && (
            <div className="mt-2">
              <div className="flex items-center gap-3">
                {onCreateProduct && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewProduct((v) => !v)
                      setShowNewVariant(false)
                    }}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Plus size={12} />
                    {showNewProduct ? "Batal" : "Produk Baru"}
                  </button>
                )}
                {onCreateVariant && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewVariant((v) => !v)
                      setShowNewProduct(false)
                    }}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Plus size={12} />
                    {showNewVariant ? "Batal" : "Varian Baru"}
                  </button>
                )}
              </div>

              {showNewVariant && (
                <div className="mt-2 p-3 border border-indigo-100 rounded-xl bg-indigo-50 space-y-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                      Cari Produk <span className="text-red-400">*</span>
                    </label>
                    {selectedProduct ? (
                      <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-sm">
                        <span className="flex-1 font-medium text-gray-800">
                          {selectedProduct.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedProduct(null)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <input
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="Ketik nama produk..."
                          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                        />
                        {productResults.length > 0 && (
                          <div className="border border-gray-200 rounded-lg bg-white shadow-sm max-h-40 overflow-y-auto">
                            {productResults.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  setSelectedProduct(p)
                                  setProductSearch("")
                                  setProductResults([])
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 border-b border-gray-50 last:border-0"
                              >
                                {p.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                        Nama Varian <span className="text-red-400">*</span>
                      </label>
                      <input
                        value={newVariantForm.variantName}
                        onChange={(e) =>
                          setNewVariantForm((f) => ({ ...f, variantName: e.target.value }))
                        }
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                        Satuan
                      </label>
                      <select
                        value={newVariantForm.unit}
                        onChange={(e) => setNewVariantForm((f) => ({ ...f, unit: e.target.value }))}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                      >
                        {[
                          "pcs",
                          "kg",
                          "g",
                          "liter",
                          "ml",
                          "botol",
                          "pak",
                          "dus",
                          "karton",
                          "lusin",
                          "sachet",
                          "bungkus",
                          "kaleng",
                          "ikat",
                          "lembar",
                        ].map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1 col-span-2">
                      <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                        Harga Beli
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={newVariantForm.costPrice || ""}
                        onChange={(e) =>
                          setNewVariantForm((f) => ({ ...f, costPrice: Number(e.target.value) }))
                        }
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateVariant}
                    disabled={!selectedProduct || !newVariantForm.variantName || creatingVariant}
                    className="text-xs font-bold bg-indigo-600 text-white rounded-lg px-3 py-1.5 hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                  >
                    {creatingVariant ? "Menyimpan..." : "Simpan & Tambah ke Daftar"}
                  </button>
                </div>
              )}

              {showNewProduct && (
                <div className="mt-2 p-3 border border-indigo-100 rounded-xl bg-indigo-50 space-y-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                      Nama Produk <span className="text-red-400">*</span>
                    </label>
                    <input
                      value={newProductForm.name}
                      onChange={(e) => setNewProductForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                        Kategori
                      </label>
                      <select
                        value={newProductForm.category}
                        onChange={(e) =>
                          setNewProductForm((f) => ({ ...f, category: e.target.value }))
                        }
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                      >
                        <option value="">— Pilih —</option>
                        {categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                        Nama Varian
                      </label>
                      <input
                        placeholder="opsional"
                        value={newProductForm.variantName}
                        onChange={(e) =>
                          setNewProductForm((f) => ({ ...f, variantName: e.target.value }))
                        }
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                        Satuan
                      </label>
                      <select
                        value={newProductForm.unit}
                        onChange={(e) => setNewProductForm((f) => ({ ...f, unit: e.target.value }))}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                      >
                        {[
                          "pcs",
                          "kg",
                          "g",
                          "liter",
                          "ml",
                          "botol",
                          "pak",
                          "dus",
                          "karton",
                          "lusin",
                          "sachet",
                          "bungkus",
                          "kaleng",
                          "ikat",
                          "lembar",
                        ].map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                        Harga Beli
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={newProductForm.costPrice || ""}
                        onChange={(e) =>
                          setNewProductForm((f) => ({ ...f, costPrice: Number(e.target.value) }))
                        }
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                      />
                    </div>
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
            <div className="space-y-2 max-h-72 overflow-y-auto px-0.5 pb-0.5">
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
                  <div className="flex gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                        Jumlah
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => updateItem(i, { qty: e.target.value })}
                          className={`${fieldCls} w-16 text-center shrink-0`}
                        />
                        <span className="text-xs font-medium text-gray-500 shrink-0">
                          {item.unit}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                        Harga / Satuan
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={item.unitCost}
                        onChange={(e) => updateItem(i, { unitCost: e.target.value })}
                        className={`${fieldCls} w-full`}
                      />
                    </div>
                  </div>
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
