"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { formatRupiah, formatDate } from "@/lib/format"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { Toggle } from "@/components/ui/Toggle"
import { ChevronDown, AlertTriangle, X, Plus, ShoppingCart } from "lucide-react"

type ListItem = { id: number; productName: string; variantName: string; unit: string; qtyPerUnit: number; qty: number; unitCost: number; isPurchased: boolean; productVariantId: number | null }
type PurchaseList = { id: number; title: string; notes: string | null; status: string; createdAt: string; totalCost: number; purchasedCount: number; _count: { items: number } }
type PurchaseListDetail = PurchaseList & { items: ListItem[] }
type LowStockVariant = { id: number; variantName: string; unit: string; stock: number; lowStockThreshold: number; costPrice: number | null; product: { name: string } }
type SearchVariant = { id: number; variantName: string; unit: string; price: number; costPrice: number | null; stock: number; product: { name: string } }

type FormItem = {
  productVariantId: number | null
  productName: string
  variantName: string
  unit: string
  qtyPerUnit: string
  qty: string
  unitCost: string
}

export default function DaftarBelanjaPage() {
  const [lists, setLists] = useState<PurchaseList[]>([])
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [details, setDetails] = useState<Record<number, PurchaseListDetail>>({})
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [lowStock, setLowStock] = useState<LowStockVariant[]>([])
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({ title: "", notes: "", items: [] as FormItem[] })
  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState<SearchVariant[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [allVariants, setAllVariants] = useState<SearchVariant[]>([])
  const searchRef = useRef<HTMLDivElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    const res = await fetch("/api/purchase-lists")
    setLists(await res.json())
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch("/api/products?limit=200").then((r) => r.json()).then((data) => {
      const vs: SearchVariant[] = data.products.flatMap((p: any) =>
        p.variants.map((v: any) => ({ ...v, product: { name: p.name } }))
      )
      setAllVariants(vs)
      const ls = vs.filter((v) => v.stock <= (v as any).lowStockThreshold)
      setLowStock(ls as any)
    })
  }, [])

  useEffect(() => {
    if (!searchOpen) return
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [searchOpen])

  function showVariants(q: string) {
    if (!q.trim()) {
      const results = allVariants.slice(0, 10)
      setSearchResults(results)
      setSearchOpen(results.length > 0)
      return
    }
    const q2 = q.toLowerCase()
    const results = allVariants.filter((v) =>
      v.product.name.toLowerCase().includes(q2) || v.variantName.toLowerCase().includes(q2)
    ).slice(0, 10)
    setSearchResults(results)
    setSearchOpen(results.length > 0)
  }

  function handleSearchInput(q: string) {
    setSearch(q)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => showVariants(q), 150)
  }

  function addVariantToForm(v: SearchVariant) {
    setForm((f) => ({
      ...f,
      items: [...f.items, {
        productVariantId: v.id,
        productName: v.product.name,
        variantName: v.variantName,
        unit: v.unit,
        qtyPerUnit: "1",
        qty: "1",
        unitCost: String(v.costPrice ?? ""),
      }],
    }))
    setSearch("")
    setSearchResults([])
    setSearchOpen(false)
  }

  function addLowStockToForm(v: LowStockVariant) {
    if (form.items.some((i) => i.productVariantId === v.id)) return
    setForm((f) => ({
      ...f,
      items: [...f.items, {
        productVariantId: v.id,
        productName: v.product.name,
        variantName: v.variantName,
        unit: v.unit,
        qtyPerUnit: "1",
        qty: String(Math.max(1, v.lowStockThreshold - v.stock + v.lowStockThreshold)),
        unitCost: String(v.costPrice ?? ""),
      }],
    }))
  }

  function removeItem(i: number) {
    setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))
  }

  async function toggleDetail(id: number) {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (details[id]) return
    setLoadingId(id)
    const res = await fetch(`/api/purchase-lists/${id}`)
    const data = await res.json()
    setDetails((prev) => ({ ...prev, [id]: data }))
    setLoadingId(null)
  }

  async function handleCreate() {
    if (!form.title || form.items.length === 0) return
    setLoading(true)
    await fetch("/api/purchase-lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        notes: form.notes || undefined,
        items: form.items.map((i) => ({
          productVariantId: i.productVariantId,
          productName: i.productName,
          variantName: i.variantName,
          unit: i.unit,
          qtyPerUnit: Number(i.qtyPerUnit) || 1,
          qty: Number(i.qty),
          unitCost: Number(i.unitCost),
        })),
      }),
    })
    setLoading(false)
    setModalOpen(false)
    setForm({ title: "", notes: "", items: [] })
    load()
  }

  async function toggleItemPurchased(listId: number, itemId: number, isPurchased: boolean) {
    setDetails((prev) => {
      if (!prev[listId]) return prev
      return { ...prev, [listId]: { ...prev[listId], items: prev[listId].items.map((i) => i.id === itemId ? { ...i, isPurchased } : i) } }
    })
    await fetch(`/api/purchase-lists/${listId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, isPurchased }),
    })
    load()
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus daftar belanja ini?")) return
    await fetch(`/api/purchase-lists/${id}`, { method: "DELETE" })
    load()
  }

  async function markDone(id: number) {
    await fetch(`/api/purchase-lists/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DONE" }),
    })
    load()
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Daftar Belanja</h1>
          <p className="text-sm text-gray-500 mt-0.5">Belanja mandiri dari berbagai tempat</p>
        </div>
        <Button onClick={() => setModalOpen(true)}><Plus size={14} className="mr-1" />Buat Daftar</Button>
      </div>

      {lowStock.length > 0 && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-amber-600" />
            <span className="text-sm font-bold text-amber-800">{lowStock.length} produk stok menipis</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.slice(0, 8).map((v) => (
              <button
                key={v.id}
                onClick={() => { setModalOpen(true); setTimeout(() => addLowStockToForm(v), 50) }}
                className="text-xs bg-white border border-amber-300 text-amber-800 rounded-lg px-2.5 py-1.5 hover:bg-amber-100 transition-colors font-medium"
              >
                {v.product.name} {v.variantName} <span className="text-amber-500">(stok: {v.stock})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {lists.length === 0 && (
          <div className="text-center py-12 text-gray-400 bg-white border border-gray-200 rounded-xl">
            <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Belum ada daftar belanja</p>
          </div>
        )}
        {lists.map((list) => {
          const isExpanded = expandedId === list.id
          const detail = details[list.id]
          const isLoading = loadingId === list.id

          return (
            <div key={list.id} className={`bg-white border rounded-xl overflow-hidden transition-all ${isExpanded ? "border-indigo-200 shadow-md" : "border-gray-200"}`}>
              <div
                className={`flex items-center justify-between px-5 py-4 cursor-pointer select-none ${isExpanded ? "bg-indigo-50" : "hover:bg-gray-50"}`}
                onClick={() => toggleDetail(list.id)}
              >
                <div className="flex items-center gap-3">
                  <ChevronDown size={15} className={`text-gray-400 transition-transform duration-150 ${isExpanded ? "rotate-180" : ""}`} />
                  <div>
                    <p className="font-bold text-gray-900">{list.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(list.createdAt)} · {list._count.items} item · {formatRupiah(list.totalCost)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{list.purchasedCount}/{list._count.items} dibeli</span>
                  <Badge variant={list.status === "DONE" ? "success" : "warning"}>{list.status === "DONE" ? "Selesai" : "Terbuka"}</Badge>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    {list.status === "OPEN" && (
                      <Button variant="primary" size="sm" onClick={() => markDone(list.id)}>Selesai</Button>
                    )}
                    <Button variant="danger" size="sm" onClick={() => handleDelete(list.id)}>Hapus</Button>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-indigo-100 px-5 py-4 bg-indigo-50/40">
                  {isLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                      <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      Memuat...
                    </div>
                  ) : detail ? (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-400 border-b border-indigo-100">
                          <th className="text-left font-semibold pb-2 w-8"></th>
                          <th className="text-left font-semibold pb-2">Produk</th>
                          <th className="text-center font-semibold pb-2">Jumlah</th>
                          <th className="text-right font-semibold pb-2">Harga / Satuan</th>
                          <th className="text-right font-semibold pb-2">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-indigo-100/60">
                        {detail.items.map((item) => (
                          <tr key={item.id} className={item.isPurchased ? "opacity-50" : ""}>
                            <td className="py-2">
                              <Toggle
                                checked={item.isPurchased}
                                onChange={(v) => toggleItemPurchased(list.id, item.id, v)}
                                size="sm"
                              />
                            </td>
                            <td className={`py-2 font-medium ${item.isPurchased ? "line-through text-gray-400" : "text-gray-800"}`}>
                              {item.productName} <span className="text-gray-500">{item.variantName}</span>
                            </td>
                            <td className="py-2 text-center text-gray-600">
                              {item.qty} {item.unit}
                              {item.qtyPerUnit > 1 && (
                                <span className="block text-[10px] text-indigo-500">= {item.qty * item.qtyPerUnit} pcs</span>
                              )}
                            </td>
                            <td className="py-2 text-right text-gray-600 tabular-nums">{formatRupiah(Number(item.unitCost))}</td>
                            <td className="py-2 text-right font-semibold tabular-nums">{formatRupiah(Number(item.unitCost) * item.qty)}</td>
                          </tr>
                        ))}
                        <tr className="border-t border-indigo-200">
                          <td colSpan={4} className="pt-2 font-black text-gray-900 text-right pr-3">Total</td>
                          <td className="pt-2 text-right font-black text-gray-900 tabular-nums">
                            {formatRupiah(detail.items.filter((i) => i.isPurchased).reduce((s, i) => s + Number(i.unitCost) * i.qty, 0))}
                            <span className="text-gray-400 font-normal"> / {formatRupiah(detail.items.reduce((s, i) => s + Number(i.unitCost) * i.qty, 0))}</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  ) : null}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Buat Daftar Belanja" className="max-w-2xl">
        <div className="space-y-4">
          <Input
            label="Nama Daftar"
            placeholder="mis. Belanja Superindo 21 Mei"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Input
            label="Catatan"
            placeholder="Opsional..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Cari Produk</p>
            <div ref={searchRef} className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchInput(e.target.value)}
                onFocus={() => showVariants(search)}
                placeholder="Ketik atau klik untuk pilih produk..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searchOpen && (
                <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-xl mt-1 max-h-60 overflow-y-auto">
                  {searchResults.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => addVariantToForm(v)}
                      className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 flex items-center justify-between text-sm transition-colors"
                    >
                      <div>
                        <span className="font-medium text-gray-800">{v.product.name}</span>
                        <span className="text-gray-500 ml-1">{v.variantName}</span>
                        {v.stock <= 5 && <span className="ml-2 text-xs text-amber-600 font-semibold">⚠ Stok: {v.stock}</span>}
                      </div>
                      <span className="text-xs text-gray-400">{v.unit}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {form.items.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Item ({form.items.length})</p>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {form.items.map((item, i) => {
                  const fieldCls = "border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  const unitLen = Math.max(4, item.unit.length + 2)
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0 text-sm text-gray-700 truncate bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                          <span className="font-medium">{item.productName}</span>
                          {item.variantName && <span className="text-gray-400 ml-1">{item.variantName}</span>}
                        </div>
                        <button onClick={() => removeItem(i)} className="text-gray-400 hover:text-red-500 flex items-center justify-center w-7 shrink-0">
                          <X size={15} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => { const it = [...form.items]; it[i] = { ...it[i], qty: e.target.value }; setForm({ ...form, items: it }) }}
                          placeholder="Jml"
                          className={`${fieldCls} w-16 text-center shrink-0`}
                        />
                        <input
                          value={item.unit}
                          onChange={(e) => { const it = [...form.items]; it[i] = { ...it[i], unit: e.target.value }; setForm({ ...form, items: it }) }}
                          placeholder="sat."
                          style={{ width: `${unitLen}ch` }}
                          className={`${fieldCls} text-center shrink-0`}
                        />
                        <span className="text-gray-400 text-xs shrink-0">×</span>
                        <input
                          type="number"
                          value={item.qtyPerUnit}
                          onChange={(e) => { const it = [...form.items]; it[i] = { ...it[i], qtyPerUnit: e.target.value }; setForm({ ...form, items: it }) }}
                          placeholder="isi"
                          className={`${fieldCls} w-16 text-center shrink-0`}
                        />
                        <span className="text-gray-400 text-xs shrink-0">pcs</span>
                        <input
                          type="number"
                          value={item.unitCost}
                          onChange={(e) => { const it = [...form.items]; it[i] = { ...it[i], unitCost: e.target.value }; setForm({ ...form, items: it }) }}
                          placeholder="Harga/sat."
                          className={`${fieldCls} flex-1 min-w-0`}
                        />
                      </div>
                    {Number(item.qtyPerUnit) > 1 && (
                      <p className="text-[10px] text-indigo-600 font-medium pl-0.5">
                        = {Number(item.qty) * Number(item.qtyPerUnit)} {item.variantName || "pcs"} total · {formatRupiah((Number(item.unitCost) || 0) * Number(item.qty))}
                      </p>
                    )}
                  </div>
                )})}
              </div>
              <p className="text-xs text-gray-500 mt-2 text-right">
                Estimasi total: {formatRupiah(form.items.reduce((s, i) => s + (Number(i.unitCost) || 0) * (Number(i.qty) || 0), 0))}
              </p>
            </div>
          )}

          <Button onClick={handleCreate} loading={loading} disabled={!form.title || form.items.length === 0} className="w-full">
            Buat Daftar Belanja
          </Button>
        </div>
      </Modal>
    </div>
  )
}
