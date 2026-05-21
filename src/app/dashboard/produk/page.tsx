"use client"

import { useState, useEffect, useCallback } from "react"
import { Table, Thead, Tbody, Th, Td } from "@/components/ui/Table"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { formatRupiah } from "@/lib/format"

type Variant = { id: number; variantName: string; barcode: string | null; price: number; stock: number; lowStockThreshold: number; unit: string }
type Product = { id: number; name: string; category: string; supplier: { id: number; name: string } | null; variants: Variant[] }
type Supplier = { id: number; name: string }

export default function ProdukPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    name: "", category: "", supplierId: "",
    variants: [{ variantName: "", barcode: "", price: "", stock: "", unit: "pcs", lowStockThreshold: "5" }],
  })

  const load = useCallback(async () => {
    const res = await fetch(`/api/products?page=${page}&q=${encodeURIComponent(search)}`)
    const data = await res.json()
    setProducts(data.products)
    setTotal(data.total)
  }, [page, search])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    fetch("/api/suppliers").then((r) => r.json()).then((d) => setSuppliers(d.suppliers ?? []))
  }, [])

  async function handleCreate() {
    setLoading(true)
    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        category: form.category,
        supplierId: form.supplierId ? Number(form.supplierId) : null,
        variants: form.variants.map((v) => ({
          variantName: v.variantName,
          barcode: v.barcode || null,
          price: Number(v.price),
          stock: Number(v.stock),
          unit: v.unit,
          lowStockThreshold: Number(v.lowStockThreshold),
        })),
      }),
    })
    setLoading(false)
    setModalOpen(false)
    setForm({ name: "", category: "", supplierId: "", variants: [{ variantName: "", barcode: "", price: "", stock: "", unit: "pcs", lowStockThreshold: "5" }] })
    load()
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus produk ini dan semua variannya?")) return
    await fetch(`/api/products/${id}`, { method: "DELETE" })
    load()
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Produk</h1>
        <Button onClick={() => setModalOpen(true)}>+ Tambah Produk</Button>
      </div>

      <div className="mb-4 max-w-sm">
        <Input placeholder="Cari produk..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
      </div>

      <Table>
        <Thead>
          <tr>
            <Th>Nama Produk</Th>
            <Th>Kategori</Th>
            <Th>Supplier</Th>
            <Th>Varian</Th>
            <Th>Stok</Th>
            <Th />
          </tr>
        </Thead>
        <Tbody>
          {products.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50">
              <Td><span className="font-medium">{p.name}</span></Td>
              <Td><Badge>{p.category}</Badge></Td>
              <Td className="text-gray-500">{p.supplier?.name ?? "—"}</Td>
              <Td>
                <div className="space-y-0.5">
                  {p.variants.map((v) => (
                    <div key={v.id} className="text-xs text-gray-600">
                      {v.variantName} · {formatRupiah(Number(v.price))} / {v.unit}
                      {!v.barcode && <span className="ml-1 text-gray-400">(no barcode)</span>}
                    </div>
                  ))}
                </div>
              </Td>
              <Td>
                {p.variants.map((v) => (
                  <div key={v.id} className="text-xs">
                    <Badge variant={v.stock === 0 ? "danger" : v.stock <= v.lowStockThreshold ? "warning" : "success"}>
                      {v.variantName}: {v.stock} {v.unit}
                    </Badge>
                  </div>
                ))}
              </Td>
              <Td>
                <Button variant="danger" className="text-xs py-1 px-2" onClick={() => handleDelete(p.id)}>Hapus</Button>
              </Td>
            </tr>
          ))}
        </Tbody>
      </Table>

      <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
        <span>{total} produk</span>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="py-1 px-3 text-xs">Prev</Button>
          <Button variant="secondary" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)} className="py-1 px-3 text-xs">Next</Button>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Tambah Produk" className="max-w-xl">
        <div className="space-y-3">
          <Input label="Nama Produk" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Kategori" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <div>
            <label className="text-sm font-medium text-gray-700">Supplier</label>
            <select className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
              <option value="">Tanpa supplier</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Varian</p>
            {form.variants.map((v, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 mb-2 p-2 bg-gray-50 rounded-md">
                <Input placeholder="Nama varian" value={v.variantName} onChange={(e) => { const vv = [...form.variants]; vv[i].variantName = e.target.value; setForm({ ...form, variants: vv }) }} />
                <Input placeholder="Barcode (opsional)" value={v.barcode} onChange={(e) => { const vv = [...form.variants]; vv[i].barcode = e.target.value; setForm({ ...form, variants: vv }) }} />
                <Input placeholder="Harga" type="number" value={v.price} onChange={(e) => { const vv = [...form.variants]; vv[i].price = e.target.value; setForm({ ...form, variants: vv }) }} />
                <Input placeholder="Stok awal" type="number" value={v.stock} onChange={(e) => { const vv = [...form.variants]; vv[i].stock = e.target.value; setForm({ ...form, variants: vv }) }} />
                <Input placeholder="Satuan" value={v.unit} onChange={(e) => { const vv = [...form.variants]; vv[i].unit = e.target.value; setForm({ ...form, variants: vv }) }} />
                <Input placeholder="Min stok" type="number" value={v.lowStockThreshold} onChange={(e) => { const vv = [...form.variants]; vv[i].lowStockThreshold = e.target.value; setForm({ ...form, variants: vv }) }} />
              </div>
            ))}
            <Button variant="ghost" className="text-xs" onClick={() => setForm({ ...form, variants: [...form.variants, { variantName: "", barcode: "", price: "", stock: "", unit: "pcs", lowStockThreshold: "5" }] })}>
              + Tambah Varian
            </Button>
          </div>

          <Button onClick={handleCreate} loading={loading} className="w-full">Simpan Produk</Button>
        </div>
      </Modal>
    </div>
  )
}
