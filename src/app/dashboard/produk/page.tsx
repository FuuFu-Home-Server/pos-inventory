"use client"

import { useState, useEffect, useCallback } from "react"
import { Table, Thead, Tbody, Th, Td } from "@/components/ui/Table"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Toggle } from "@/components/ui/Toggle"
import { Modal } from "@/components/ui/Modal"
import { formatRupiah } from "@/lib/format"
import { ChevronDown, Package, Activity, AlertTriangle } from "lucide-react"
import { Pagination } from "@/components/ui/Pagination"

type Variant = {
  id: number
  variantName: string
  barcode: string | null
  price: number
  stock: number
  lowStockThreshold: number
  unit: string
  isActive: boolean
}
type Product = {
  id: number
  name: string
  category: string
  supplier: { id: number; name: string } | null
  variants: Variant[]
}
type Supplier = { id: number; name: string }
type Option = { id: number; name: string }

type EditVariantRow = {
  id?: number
  variantName: string
  barcode: string
  price: string
  stock: string
  unit: string
  lowStockThreshold: string
  isActive: boolean
}

function blankVariantRow(): EditVariantRow {
  return { variantName: "", barcode: "", price: "", stock: "", unit: "pcs", lowStockThreshold: "5", isActive: true }
}

function productToEditForm(p: Product) {
  return {
    name: p.name,
    category: p.category,
    supplierId: p.supplier?.id?.toString() ?? "",
    variants: p.variants.map((v) => ({
      id: v.id,
      variantName: v.variantName,
      barcode: v.barcode ?? "",
      price: String(Number(v.price)),
      stock: String(v.stock),
      unit: v.unit,
      lowStockThreshold: String(v.lowStockThreshold),
      isActive: v.isActive,
    })),
  }
}

export default function ProdukPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [stats, setStats] = useState({ activeVariants: 0, lowStockCount: 0 })
  const [search, setSearch] = useState("")
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [categories, setCategories] = useState<Option[]>([])
  const [units, setUnits] = useState<Option[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)

  const [createForm, setCreateForm] = useState({
    name: "", category: "", supplierId: "",
    variants: [blankVariantRow()],
  })

  const [editForm, setEditForm] = useState<{
    name: string; category: string; supplierId: string; variants: EditVariantRow[]
  }>({ name: "", category: "", supplierId: "", variants: [] })

  const load = useCallback(async () => {
    const res = await fetch(`/api/products?page=${page}&limit=${pageSize}&q=${encodeURIComponent(search)}`)
    const data = await res.json()
    setProducts(data.products)
    setTotal(data.total)
    if (data.stats) setStats(data.stats)
  }, [page, pageSize, search])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    Promise.all([
      fetch("/api/suppliers").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/units").then((r) => r.json()),
    ]).then(([sup, cat, unit]) => {
      setSuppliers(sup.suppliers ?? [])
      setCategories(cat)
      setUnits(unit)
    })
  }, [])

  function openEdit(p: Product) {
    setEditingProduct(p)
    setEditForm(productToEditForm(p))
  }

  async function handleCreate() {
    setLoading(true)
    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: createForm.name,
        category: createForm.category,
        supplierId: createForm.supplierId ? Number(createForm.supplierId) : null,
        variants: createForm.variants.map((v) => ({
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
    setCreateOpen(false)
    setCreateForm({ name: "", category: "", supplierId: "", variants: [blankVariantRow()] })
    load()
  }

  async function handleSaveEdit() {
    if (!editingProduct) return
    setLoading(true)
    await fetch(`/api/products/${editingProduct.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        category: editForm.category,
        supplierId: editForm.supplierId ? Number(editForm.supplierId) : null,
        variants: editForm.variants.map((v) => ({
          ...(v.id ? { id: v.id } : {}),
          variantName: v.variantName,
          barcode: v.barcode || null,
          price: Number(v.price),
          stock: Number(v.stock),
          unit: v.unit,
          lowStockThreshold: Number(v.lowStockThreshold),
          isActive: v.isActive,
        })),
      }),
    })
    setLoading(false)
    setEditingProduct(null)
    load()
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus produk ini dan semua variannya?")) return
    await fetch(`/api/products/${id}`, { method: "DELETE" })
    load()
  }

  function toggleExpand(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function toggleVariantActive(product: Product, variantId: number) {
    const variants = product.variants.map((v) =>
      v.id === variantId ? { ...v, isActive: !v.isActive } : v
    )
    await fetch(`/api/products/${product.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: product.name,
        category: product.category,
        supplierId: product.supplier?.id ?? null,
        variants: variants.map((v) => ({
          id: v.id,
          variantName: v.variantName,
          barcode: v.barcode ?? null,
          price: Number(v.price),
          stock: v.stock,
          unit: v.unit,
          lowStockThreshold: v.lowStockThreshold,
          isActive: v.isActive,
        })),
      }),
    })
    load()
  }

  function updateCreateVariant(i: number, field: string, val: string) {
    const vv = [...createForm.variants] as any[]
    vv[i][field] = val
    setCreateForm({ ...createForm, variants: vv })
  }

  function updateEditVariant(i: number, field: keyof EditVariantRow, val: string | boolean) {
    const vv = [...editForm.variants]
    ;(vv[i] as any)[field] = val
    setEditForm({ ...editForm, variants: vv })
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Produk</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} produk terdaftar</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>+ Tambah Produk</Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
            <Package size={16} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Produk</p>
            <p className="text-xl font-black text-gray-900 tabular-nums">{total}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
            <Activity size={16} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Varian Aktif</p>
            <p className="text-xl font-black text-gray-900 tabular-nums">{stats.activeVariants}</p>
          </div>
        </div>
        <div className={`border rounded-xl p-4 flex items-center gap-3 ${stats.lowStockCount > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200"}`}>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${stats.lowStockCount > 0 ? "bg-amber-100" : "bg-gray-100"}`}>
            <AlertTriangle size={16} className={stats.lowStockCount > 0 ? "text-amber-600" : "text-gray-400"} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Stok Menipis</p>
            <p className={`text-xl font-black tabular-nums ${stats.lowStockCount > 0 ? "text-amber-700" : "text-gray-900"}`}>{stats.lowStockCount}</p>
          </div>
        </div>
      </div>

      <div className="mb-4 max-w-sm">
        <Input placeholder="Cari produk..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
      </div>

      <Table>
        <Thead>
          <tr>
            <Th>Nama Produk</Th>
            <Th>Kategori / Barcode</Th>
            <Th>Supplier / Harga</Th>
            <Th>Stok</Th>
            <Th>Status</Th>
            <Th />
          </tr>
        </Thead>
        <Tbody>
          {products.map((p) => {
            const expanded = expandedIds.has(p.id)
            const activeCount = p.variants.filter((v) => v.isActive).length
            return (
              <>
                <tr
                  key={p.id}
                  className="hover:bg-gray-50 cursor-pointer select-none"
                  onClick={() => toggleExpand(p.id)}
                >
                  <Td>
                    <div className="flex items-center gap-2">
                      <ChevronDown size={14} className={`text-gray-400 transition-transform duration-150 shrink-0 ${expanded ? "rotate-180" : ""}`} />
                      <span className="font-semibold text-gray-900">{p.name}</span>
                    </div>
                  </Td>
                  <Td><Badge>{p.category}</Badge></Td>
                  <Td className="text-gray-500 text-sm">{p.supplier?.name ?? "—"}</Td>
                  <Td colSpan={2}>
                    <span className="text-xs text-gray-400">{activeCount} aktif · {p.variants.length} varian</span>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>Edit</Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(p.id)}>Hapus</Button>
                    </div>
                  </Td>
                </tr>

                {expanded && p.variants.map((v, vi) => (
                  <tr
                    key={`${p.id}-v-${v.id}`}
                    className={`bg-gray-50/60 ${!v.isActive ? "opacity-50" : ""} ${vi === p.variants.length - 1 ? "border-b-2 border-gray-200" : ""}`}
                  >
                    <Td className="pl-10">
                      <div className="flex items-center gap-1.5 text-sm text-gray-700">
                        <span className="text-gray-300 text-base leading-none">└</span>
                        <span className="font-medium">{v.variantName}</span>
                      </div>
                    </Td>
                    <Td className="text-xs">
                      {v.barcode
                        ? <span className="font-mono bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">{v.barcode}</span>
                        : <span className="text-gray-300">—</span>
                      }
                    </Td>
                    <Td className="text-sm text-gray-600 tabular-nums">
                      {formatRupiah(Number(v.price))}<span className="text-gray-400 text-xs">/{v.unit}</span>
                    </Td>
                    <Td>
                      <Badge variant={v.stock === 0 ? "danger" : v.stock <= v.lowStockThreshold ? "warning" : "success"}>
                        {v.stock} {v.unit}
                      </Badge>
                    </Td>
                    <Td>
                      <Toggle
                        checked={v.isActive}
                        onChange={() => toggleVariantActive(p, v.id)}
                        label={v.isActive ? "Aktif" : "Nonaktif"}
                        size="sm"
                      />
                    </Td>
                    <Td />
                  </tr>
                ))}
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

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Tambah Produk" className="max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nama Produk" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
            <Select
              label="Kategori"
              value={createForm.category}
              onChange={(v) => setCreateForm({ ...createForm, category: v })}
              options={categories.map((c) => ({ value: c.name, label: c.name }))}
              placeholder="Pilih kategori"
            />
          </div>
          <Select
            label="Supplier"
            value={createForm.supplierId}
            onChange={(v) => setCreateForm({ ...createForm, supplierId: v })}
            options={suppliers.map((s) => ({ value: String(s.id), label: s.name }))}
            placeholder="Tanpa supplier"
          />
          <VariantEditor
            variants={createForm.variants}
            onChange={(vv) => setCreateForm({ ...createForm, variants: vv })}
            units={units}
            showActive={false}
          />
          <Button onClick={handleCreate} loading={loading} className="w-full">Simpan Produk</Button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editingProduct} onClose={() => setEditingProduct(null)} title={`Edit: ${editingProduct?.name ?? ""}`} className="max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nama Produk" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            <Select
              label="Kategori"
              value={editForm.category}
              onChange={(v) => setEditForm({ ...editForm, category: v })}
              options={categories.map((c) => ({ value: c.name, label: c.name }))}
              placeholder="Pilih kategori"
            />
          </div>
          <Select
            label="Supplier"
            value={editForm.supplierId}
            onChange={(v) => setEditForm({ ...editForm, supplierId: v })}
            options={suppliers.map((s) => ({ value: String(s.id), label: s.name }))}
            placeholder="Tanpa supplier"
          />
          <VariantEditor
            variants={editForm.variants}
            onChange={(vv) => setEditForm({ ...editForm, variants: vv })}
            units={units}
            showActive
          />
          <Button onClick={handleSaveEdit} loading={loading} className="w-full">Simpan Perubahan</Button>
        </div>
      </Modal>
    </div>
  )
}

function VariantEditor({
  variants,
  onChange,
  units,
  showActive,
}: {
  variants: EditVariantRow[]
  onChange: (vv: EditVariantRow[]) => void
  units: Option[]
  showActive: boolean
}) {
  function update(i: number, field: keyof EditVariantRow, val: string | boolean) {
    const vv = [...variants]
    ;(vv[i] as any)[field] = val
    onChange(vv)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-gray-700">Varian</p>
        <button
          type="button"
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          onClick={() => onChange([...variants, blankVariantRow()])}
        >
          + Tambah Varian
        </button>
      </div>
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {variants.map((v, i) => (
          <div key={i} className={`border rounded-xl p-3 space-y-2 transition-colors ${!v.isActive ? "border-gray-200 bg-gray-50/60 opacity-60" : "border-indigo-100 bg-indigo-50/20"}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Varian {i + 1}</span>
              {showActive && (
                <Toggle
                  checked={v.isActive}
                  onChange={(val) => update(i, "isActive", val)}
                  label={v.isActive ? "Aktif" : "Nonaktif"}
                  size="sm"
                />
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input label="Nama Varian" placeholder="cth. 1kg" value={v.variantName} onChange={(e) => update(i, "variantName", e.target.value)} />
              <Input label="Barcode" placeholder="(opsional)" value={v.barcode} onChange={(e) => update(i, "barcode", e.target.value)} />
              <Select
                label="Satuan"
                value={v.unit}
                onChange={(val) => update(i, "unit", val)}
                options={units.map((u) => ({ value: u.name, label: u.name }))}
                placeholder="Pilih satuan"
              />
              <Input label="Harga Jual (Rp)" placeholder="0" type="number" value={v.price} onChange={(e) => update(i, "price", e.target.value)} />
              <Input label="Stok" placeholder="0" type="number" value={v.stock} onChange={(e) => update(i, "stock", e.target.value)} />
              <Input label="Min Stok" placeholder="5" type="number" value={v.lowStockThreshold} onChange={(e) => update(i, "lowStockThreshold", e.target.value)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
