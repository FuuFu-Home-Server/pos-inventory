"use client"

import { useState, useEffect, useCallback } from "react"
import { Table, Thead, Tbody, Th, Td } from "@/components/ui/Table"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"
import { Input } from "@/components/ui/Input"
import { formatDateShort } from "@/lib/format"

type PO = { id: number; status: string; supplier: { name: string }; user: { name: string }; createdAt: string; receivedAt: string | null; _count: { items: number } }
type Variant = { id: number; variantName: string; unit: string; price: number; product: { name: string } }
type Supplier = { id: number; name: string }

const statusVariant = (s: string): "success" | "danger" | "warning" =>
  s === "RECEIVED" ? "success" : s === "CANCELLED" ? "danger" : "warning"

export default function PurchaseOrderPage() {
  const [orders, setOrders] = useState<PO[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    supplierId: "",
    notes: "",
    items: [{ productVariantId: "", qty: "1", unitCost: "" }],
  })

  const load = useCallback(async () => {
    const res = await fetch(`/api/purchase-orders?page=${page}`)
    const data = await res.json()
    setOrders(data.orders)
    setTotal(data.total)
  }, [page])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    Promise.all([
      fetch("/api/suppliers").then((r) => r.json()),
      fetch("/api/products?limit=100").then((r) => r.json()),
    ]).then(([s, p]) => {
      setSuppliers(s.suppliers)
      setVariants(p.products.flatMap((prod: { name: string; variants: (Variant & { id: number })[] }) => prod.variants.map((v) => ({ ...v, product: { name: prod.name } }))))
    })
  }, [])

  async function handleCreate() {
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
    load()
  }

  async function handleStatus(id: number, status: "RECEIVED" | "CANCELLED") {
    const action = status === "RECEIVED" ? "Konfirmasi terima barang?" : "Batalkan PO ini?"
    if (!confirm(action)) return
    await fetch(`/api/purchase-orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })
    load()
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Purchase Order</h1>
        <Button onClick={() => setModalOpen(true)}>+ Buat PO</Button>
      </div>
      <Table>
        <Thead><tr><Th>ID</Th><Th>Supplier</Th><Th>Dibuat oleh</Th><Th>Status</Th><Th>Tgl Terima</Th><Th>Item</Th><Th /></tr></Thead>
        <Tbody>
          {orders.map((o) => (
            <tr key={o.id} className="hover:bg-gray-50">
              <Td className="font-mono text-xs">#{o.id}</Td>
              <Td className="font-medium">{o.supplier.name}</Td>
              <Td className="text-gray-500 text-xs">{o.user.name}</Td>
              <Td><Badge variant={statusVariant(o.status)}>{o.status}</Badge></Td>
              <Td className="text-gray-500 text-xs">{o.receivedAt ? formatDateShort(o.receivedAt) : "—"}</Td>
              <Td className="text-gray-500">{o._count.items} item</Td>
              <Td>
                {o.status === "DRAFT" && (
                  <div className="flex gap-1">
                    <Button variant="primary" className="text-xs py-1 px-2" onClick={() => handleStatus(o.id, "RECEIVED")}>Terima</Button>
                    <Button variant="danger" className="text-xs py-1 px-2" onClick={() => handleStatus(o.id, "CANCELLED")}>Batal</Button>
                  </div>
                )}
              </Td>
            </tr>
          ))}
        </Tbody>
      </Table>
      <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
        <span>{total} PO</span>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="py-1 px-3 text-xs">← Prev</Button>
          <Button variant="secondary" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)} className="py-1 px-3 text-xs">Next →</Button>
        </div>
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Buat Purchase Order" className="max-w-2xl">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Supplier</label>
            <select className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
              <option value="">Pilih supplier...</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <Input label="Catatan" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Item</p>
            {form.items.map((item, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                <div>
                  <select className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" value={item.productVariantId} onChange={(e) => { const it = [...form.items]; it[i].productVariantId = e.target.value; setForm({ ...form, items: it }) }}>
                    <option value="">Pilih produk...</option>
                    {variants.map((v) => <option key={v.id} value={v.id}>{v.product.name} — {v.variantName}</option>)}
                  </select>
                </div>
                <Input placeholder="Qty" type="number" value={item.qty} onChange={(e) => { const it = [...form.items]; it[i].qty = e.target.value; setForm({ ...form, items: it }) }} />
                <Input placeholder="Harga beli" type="number" value={item.unitCost} onChange={(e) => { const it = [...form.items]; it[i].unitCost = e.target.value; setForm({ ...form, items: it }) }} />
              </div>
            ))}
            <Button variant="ghost" className="text-xs" onClick={() => setForm({ ...form, items: [...form.items, { productVariantId: "", qty: "1", unitCost: "" }] })}>
              + Tambah Item
            </Button>
          </div>
          <Button onClick={handleCreate} loading={loading} className="w-full">Buat PO</Button>
        </div>
      </Modal>
    </div>
  )
}
