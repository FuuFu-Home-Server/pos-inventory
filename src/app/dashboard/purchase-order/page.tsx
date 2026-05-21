"use client"

import { useState, useEffect, useCallback } from "react"
import { Table, Thead, Tbody, Th, Td } from "@/components/ui/Table"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { formatDateShort, formatRupiah } from "@/lib/format"
import { ChevronDown } from "lucide-react"
import { Pagination } from "@/components/ui/Pagination"
import { PurchaseModal, PurchaseItem, VariantResult } from "@/components/ui/PurchaseModal"

type POItem = { id: number; qty: number; unitCost: number; subtotal: number; productVariant: { variantName: string; unit: string; product: { name: string } } }
type PO = { id: number; status: string; supplier: { name: string }; user: { name: string }; createdAt: string; receivedAt: string | null; _count: { items: number } }
type PODetail = PO & { items: POItem[] }
type Supplier = { id: number; name: string }

const statusVariant = (s: string): "success" | "danger" | "warning" =>
  s === "RECEIVED" ? "success" : s === "CANCELLED" ? "danger" : "warning"

const statusLabel: Record<string, string> = {
  DRAFT: "Draf",
  RECEIVED: "Diterima",
  CANCELLED: "Dibatalkan",
}

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
  const [variants, setVariants] = useState<VariantResult[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ supplierId: "", notes: "", items: [] as PurchaseItem[] })

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

  async function searchVariants(q: string): Promise<VariantResult[]> {
    if (!q.trim()) return variants.slice(0, 10)
    const q2 = q.toLowerCase()
    return variants.filter((v) =>
      v.product.name.toLowerCase().includes(q2) || v.variantName.toLowerCase().includes(q2)
    ).slice(0, 10)
  }

  function handleAddVariant(v: VariantResult) {
    setForm((f) => ({
      ...f,
      items: [...f.items, {
        variantId: v.id,
        label: `${v.product.name} — ${v.variantName}`,
        unit: v.unit,
        qty: "1",
        unitCost: String(v.costPrice ?? ""),
      }],
    }))
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
        items: form.items.map((i) => ({ productVariantId: i.variantId, qty: Number(i.qty), unitCost: Number(i.unitCost) })),
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

      <PurchaseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Buat Purchase Order"
        headerSlot={<>
          <Select
            label="Supplier"
            value={form.supplierId}
            onChange={(v) => setForm({ ...form, supplierId: v })}
            options={suppliers.map((s) => ({ value: String(s.id), label: s.name }))}
            placeholder="Pilih supplier..."
          />
          <Input label="Catatan" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </>}
        items={form.items}
        onItemsChange={(items) => setForm((f) => ({ ...f, items }))}
        searchVariants={searchVariants}
        onAddVariant={handleAddVariant}
        onSubmit={handleCreate}
        loading={loading}
        submitLabel="Buat PO"
        submitDisabled={!form.supplierId || form.items.length === 0}
      />
    </div>
  )
}
