"use client"

import { useState, useEffect, useCallback } from "react"
import { Table, Thead, Tbody, Th, Td } from "@/components/ui/Table"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { formatRupiah } from "@/lib/format"

type Discount = { id: number; name: string; type: string; value: number; scope: string; isActive: boolean; minPurchase: number | null; product: { name: string } | null }
type Product = { id: number; name: string }

export default function DiskonPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: "", type: "PERCENT", value: "", scope: "TRANSACTION", productId: "", minPurchase: "", isActive: true })

  const load = useCallback(async () => {
    const res = await fetch("/api/discounts")
    const data = await res.json()
    setDiscounts(data.discounts)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    fetch("/api/products?limit=100").then((r) => r.json()).then((d) => setProducts(d.products))
  }, [])

  async function handleCreate() {
    setLoading(true)
    await fetch("/api/discounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        type: form.type,
        value: Number(form.value),
        scope: form.scope,
        productId: form.scope === "PRODUCT" && form.productId ? Number(form.productId) : null,
        minPurchase: form.minPurchase ? Number(form.minPurchase) : null,
        isActive: form.isActive,
      }),
    })
    setLoading(false)
    setModalOpen(false)
    load()
  }

  async function handleToggle(id: number, isActive: boolean) {
    await fetch(`/api/discounts/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !isActive }) })
    load()
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus diskon ini?")) return
    await fetch(`/api/discounts/${id}`, { method: "DELETE" })
    load()
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Diskon</h1>
        <Button onClick={() => setModalOpen(true)}>+ Tambah Diskon</Button>
      </div>
      <Table>
        <Thead><tr><Th>Nama</Th><Th>Tipe</Th><Th>Nilai</Th><Th>Berlaku untuk</Th><Th>Min. Belanja</Th><Th>Status</Th><Th /></tr></Thead>
        <Tbody>
          {discounts.map((d) => (
            <tr key={d.id} className="hover:bg-gray-50">
              <Td className="font-medium">{d.name}</Td>
              <Td><Badge>{d.type}</Badge></Td>
              <Td>{d.type === "PERCENT" ? `${d.value}%` : formatRupiah(Number(d.value))}</Td>
              <Td className="text-gray-500 text-xs">{d.scope === "PRODUCT" && d.product ? d.product.name : "Semua transaksi"}</Td>
              <Td className="text-gray-500 text-xs">{d.minPurchase ? formatRupiah(Number(d.minPurchase)) : "—"}</Td>
              <Td><Badge variant={d.isActive ? "success" : "default"}>{d.isActive ? "Aktif" : "Nonaktif"}</Badge></Td>
              <Td>
                <div className="flex gap-1">
                  <Button variant="secondary" className="text-xs py-1 px-2" onClick={() => handleToggle(d.id, d.isActive)}>{d.isActive ? "Nonaktifkan" : "Aktifkan"}</Button>
                  <Button variant="danger" className="text-xs py-1 px-2" onClick={() => handleDelete(d.id)}>Hapus</Button>
                </div>
              </Td>
            </tr>
          ))}
        </Tbody>
      </Table>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Tambah Diskon">
        <div className="space-y-3">
          <Input label="Nama Diskon" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Tipe</label>
              <select className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="PERCENT">Persen (%)</option>
                <option value="FLAT">Nominal (Rp)</option>
              </select>
            </div>
            <Input label="Nilai" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder={form.type === "PERCENT" ? "10" : "5000"} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Berlaku untuk</label>
            <select className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value, productId: "" })}>
              <option value="TRANSACTION">Semua transaksi</option>
              <option value="PRODUCT">Produk tertentu</option>
            </select>
          </div>
          {form.scope === "PRODUCT" && (
            <div>
              <label className="text-sm font-medium text-gray-700">Produk</label>
              <select className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
                <option value="">Pilih produk...</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <Input label="Min. Belanja (opsional)" type="number" value={form.minPurchase} onChange={(e) => setForm({ ...form, minPurchase: e.target.value })} placeholder="0" />
          <Button onClick={handleCreate} loading={loading} className="w-full">Simpan Diskon</Button>
        </div>
      </Modal>
    </div>
  )
}
