"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Table, Thead, Tbody, Th, Td } from "@/components/ui/Table"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { formatDateShort, formatRupiah } from "@/lib/format"
import { ChevronDown, X } from "lucide-react"
import { Pagination } from "@/components/ui/Pagination"

type POItem = { id: number; qty: number; unitCost: number; subtotal: number; productVariant: { variantName: string; unit: string; product: { name: string } } }
type PO = { id: number; status: string; supplier: { name: string }; user: { name: string }; createdAt: string; receivedAt: string | null; _count: { items: number } }
type PODetail = PO & { items: POItem[] }
type Variant = { id: number; variantName: string; unit: string; price: number; costPrice: number | null; stock: number; product: { name: string } }
type Supplier = { id: number; name: string }

const statusVariant = (s: string): "success" | "danger" | "warning" =>
  s === "RECEIVED" ? "success" : s === "CANCELLED" ? "danger" : "warning"

const statusLabel: Record<string, string> = {
  DRAFT: "Draf",
  RECEIVED: "Diterima",
  CANCELLED: "Dibatalkan",
}

type FormItem = { productVariantId: string; qty: string; unitCost: string; _label?: string; _unit?: string }

export default function PurchaseOrderPage() {
  const [orders, setOrders] = useState<PO[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [details, setDetails] = useState<Record<number, PODetail>>({})
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ supplierId: "", notes: "", items: [] as FormItem[] })
  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState<Variant[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/purchase-orders?page=${page}&limit=${pageSize}`)
    const data = await res.json()
    setOrders(data.orders)
    setTotal(data.total)
  }, [page, pageSize])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    Promise.all([
      fetch("/api/suppliers").then((r) => r.json()),
      fetch("/api/products?limit=200").then((r) => r.json()),
    ]).then(([s, p]) => {
      setSuppliers(s.suppliers)
      setVariants(p.products.flatMap((prod: any) => prod.variants.map((v: any) => ({ ...v, product: { name: prod.name } }))))
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
      const results = variants.slice(0, 10)
      setSearchResults(results)
      setSearchOpen(results.length > 0)
      return
    }
    const q2 = q.toLowerCase()
    const results = variants.filter((v) =>
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

  function addVariantToForm(v: Variant) {
    setForm((f) => ({
      ...f,
      items: [...f.items, {
        productVariantId: String(v.id),
        qty: "1",
        unitCost: String(v.costPrice ?? ""),
        _label: `${v.product.name} — ${v.variantName}`,
        _unit: v.unit,
      }],
    }))
    setSearch("")
    setSearchResults([])
    setSearchOpen(false)
  }

  function removeItem(i: number) {
    setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))
  }

  async function toggleDetail(id: number) {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (details[id]) return
    setLoadingId(id)
    const res = await fetch(`/api/purchase-orders/${id}`)
    const data = await res.json()
    setDetails((prev) => ({ ...prev, [id]: data }))
    setLoadingId(null)
  }

  async function handleCreate() {
    if (!form.supplierId || form.items.length === 0) return
    setLoading(true)
    await fetch("/api/purchase-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId: Number(form.supplierId),
        notes: form.notes || undefined,
        items: form.items.map((i) => ({ productVariantId: Number(i.productVariantId), qty: Number(i.qty), unitCost: Number(i.unitCost) })),
      }),
    })
    setLoading(false)
    setModalOpen(false)
    setForm({ supplierId: "", notes: "", items: [] })
    load()
  }

  async function handleStatus(id: number, status: "RECEIVED" | "CANCELLED") {
    if (!confirm(status === "RECEIVED" ? "Konfirmasi terima barang?" : "Batalkan PO ini?")) return
    await fetch(`/api/purchase-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    setDetails((prev) => { const next = { ...prev }; delete next[id]; return next })
    load()
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Purchase Order</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} PO</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ Buat PO</Button>
      </div>

      <Table>
        <Thead>
          <tr>
            <Th>#</Th>
            <Th>Supplier</Th>
            <Th>Dibuat oleh</Th>
            <Th>Status</Th>
            <Th>Tgl Terima</Th>
            <Th>Item</Th>
            <Th />
          </tr>
        </Thead>
        <Tbody>
          {orders.map((o) => {
            const isExpanded = expandedId === o.id
            const detail = details[o.id]
            const isLoading = loadingId === o.id

            return (
              <>
                <tr
                  key={o.id}
                  className={`cursor-pointer select-none transition-colors ${isExpanded ? "bg-indigo-50" : "hover:bg-gray-50"}`}
                  onClick={() => toggleDetail(o.id)}
                >
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <ChevronDown size={13} className={`text-gray-400 transition-transform duration-150 shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                      <span className="text-gray-400 font-mono text-xs">#{o.id}</span>
                    </div>
                  </Td>
                  <Td className="font-medium">{o.supplier.name}</Td>
                  <Td className="text-gray-500 text-xs">{o.user.name}</Td>
                  <Td><Badge variant={statusVariant(o.status)}>{statusLabel[o.status] ?? o.status}</Badge></Td>
                  <Td className="text-gray-500 text-xs">{o.receivedAt ? formatDateShort(o.receivedAt) : "—"}</Td>
                  <Td className="text-gray-500">{o._count.items} item</Td>
                  <Td onClick={(e) => e.stopPropagation()}>
                    {o.status === "DRAFT" && (
                      <div className="flex gap-1">
                        <Button variant="primary" size="sm" onClick={() => handleStatus(o.id, "RECEIVED")}>Terima</Button>
                        <Button variant="danger" size="sm" onClick={() => handleStatus(o.id, "CANCELLED")}>Batal</Button>
                      </div>
                    )}
                  </Td>
                </tr>

                {isExpanded && (
                  <tr key={`${o.id}-detail`}>
                    <td colSpan={7} className="px-0 py-0 border-b border-indigo-100">
                      <div className="bg-indigo-50/60 border-t border-indigo-100 px-6 py-4">
                        {isLoading ? (
                          <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                            Memuat detail...
                          </div>
                        ) : detail ? (
                          <div className="grid grid-cols-[1fr_200px] gap-8 w-full">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-400 border-b border-indigo-100">
                                  <th className="text-left font-semibold pb-1.5">Produk</th>
                                  <th className="text-center font-semibold pb-1.5">Qty</th>
                                  <th className="text-right font-semibold pb-1.5">Harga Beli</th>
                                  <th className="text-right font-semibold pb-1.5">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-indigo-100/60">
                                {detail.items.map((item) => (
                                  <tr key={item.id}>
                                    <td className="py-1.5 text-gray-800 font-medium">
                                      {item.productVariant.product.name}
                                      <span className="text-gray-500 ml-1">{item.productVariant.variantName}</span>
                                    </td>
                                    <td className="py-1.5 text-center text-gray-600">{item.qty} {item.productVariant.unit}</td>
                                    <td className="py-1.5 text-right text-gray-600 tabular-nums">{formatRupiah(Number(item.unitCost))}</td>
                                    <td className="py-1.5 text-right font-semibold tabular-nums">{formatRupiah(Number(item.subtotal))}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div className="text-xs space-y-1 text-right">
                              <div className="flex justify-between gap-6 font-black text-sm text-gray-900 border-t border-indigo-200 pt-1">
                                <span>Total</span>
                                <span className="tabular-nums">
                                  {formatRupiah(detail.items.reduce((s, i) => s + Number(i.subtotal), 0))}
                                </span>
                              </div>
                              <div className="flex justify-between gap-6 text-gray-500">
                                <span>Supplier</span>
                                <span>{detail.supplier.name}</span>
                              </div>
                              <div className="flex justify-between gap-6 text-gray-500">
                                <span>Dibuat</span>
                                <span>{formatDateShort(detail.createdAt)}</span>
                              </div>
                              {detail.receivedAt && (
                                <div className="flex justify-between gap-6 text-emerald-600">
                                  <span>Diterima</span>
                                  <span>{formatDateShort(detail.receivedAt)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            )
          })}
        </Tbody>
      </Table>

      <Pagination
        page={page}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Buat Purchase Order" className="max-w-2xl">
        <div className="space-y-4">
          <Select
            label="Supplier"
            value={form.supplierId}
            onChange={(v) => setForm({ ...form, supplierId: v })}
            options={suppliers.map((s) => ({ value: String(s.id), label: s.name }))}
            placeholder="Pilih supplier..."
          />
          <Input label="Catatan" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

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
                      className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 flex items-center justify-between text-sm transition-colors border-b border-gray-50 last:border-0"
                    >
                      <span className="font-medium text-gray-800">{v.product.name} <span className="text-gray-500">{v.variantName}</span></span>
                      <span className="text-xs text-gray-400">Stok: {v.stock} {v.unit}</span>
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
                  const unitLen = Math.max(4, (item._unit?.length ?? 0) + 2)
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0 text-sm text-gray-700 truncate bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">{item._label}</div>
                        <button onClick={() => removeItem(i)} className="text-gray-400 hover:text-red-500 flex items-center justify-center w-7 shrink-0">
                          <X size={15} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Qty"
                          value={item.qty}
                          onChange={(e) => { const it = [...form.items]; it[i] = { ...it[i], qty: e.target.value }; setForm({ ...form, items: it }) }}
                          className={`${fieldCls} w-16 text-center shrink-0`}
                        />
                        <input
                          value={item._unit ?? ""}
                          onChange={(e) => { const it = [...form.items]; it[i] = { ...it[i], _unit: e.target.value }; setForm({ ...form, items: it }) }}
                          placeholder="sat."
                          style={{ width: `${unitLen}ch` }}
                          className={`${fieldCls} text-center shrink-0`}
                        />
                        <input
                          type="number"
                          placeholder="Harga beli"
                          value={item.unitCost}
                          onChange={(e) => { const it = [...form.items]; it[i] = { ...it[i], unitCost: e.target.value }; setForm({ ...form, items: it }) }}
                          className={`${fieldCls} flex-1 min-w-0`}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <Button onClick={handleCreate} loading={loading} disabled={!form.supplierId || form.items.length === 0} className="w-full">
            Buat PO
          </Button>
        </div>
      </Modal>
    </div>
  )
}
