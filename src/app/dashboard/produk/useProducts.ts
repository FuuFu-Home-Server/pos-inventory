"use client"

import { useState, useEffect, useCallback } from "react"

export type Variant = {
  id: number
  variantName: string
  barcode: string | null
  price: number
  stock: number
  lowStockThreshold: number
  unit: string
  isActive: boolean
}
export type Product = {
  id: number
  name: string
  category: string
  supplier: { id: number; name: string } | null
  variants: Variant[]
}
export type Supplier = { id: number; name: string }
export type Option = { id: number; name: string }

export type EditVariantRow = {
  id?: number
  variantName: string
  barcode: string
  price: string
  stock: string
  unit: string
  lowStockThreshold: string
  isActive: boolean
}

export function blankVariantRow(): EditVariantRow {
  return {
    variantName: "",
    barcode: "",
    price: "",
    stock: "",
    unit: "pcs",
    lowStockThreshold: "5",
    isActive: true,
  }
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

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [stats, setStats] = useState({ activeVariants: 0, lowStockCount: 0, incompleteCount: 0 })
  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState("")
  const [filterSupplierId, setFilterSupplierId] = useState("")
  const [filterStockStatus, setFilterStockStatus] = useState<"all" | "low" | "out">("all")
  const [filterDataStatus, setFilterDataStatus] = useState<"all" | "incomplete">("all")
  const [sortBy, setSortBy] = useState<"name" | "category" | "createdAt">("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [categories, setCategories] = useState<Option[]>([])
  const [units, setUnits] = useState<Option[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)

  const [createForm, setCreateForm] = useState({
    name: "",
    category: "",
    supplierId: "",
    variants: [blankVariantRow()],
  })

  const [editForm, setEditForm] = useState<{
    name: string
    category: string
    supplierId: string
    variants: EditVariantRow[]
  }>({ name: "", category: "", supplierId: "", variants: [] })

  const load = useCallback(async () => {
    setListLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      limit: String(pageSize),
      q: search,
      category: filterCategory,
      supplierId: filterSupplierId,
      stockStatus: filterStockStatus,
      dataStatus: filterDataStatus,
      sortBy,
      sortDir,
    })
    const res = await fetch(`/api/products?${params}`)
    const data = await res.json()
    setProducts(data.products)
    setTotal(data.total)
    if (data.stats) setStats(data.stats)
    setListLoading(false)
  }, [
    page,
    pageSize,
    search,
    filterCategory,
    filterSupplierId,
    filterStockStatus,
    filterDataStatus,
    sortBy,
    sortDir,
  ])

  useEffect(() => {
    load()
  }, [load])
  useEffect(() => {
    setPage(1)
  }, [
    search,
    filterCategory,
    filterSupplierId,
    filterStockStatus,
    filterDataStatus,
    sortBy,
    sortDir,
  ])
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
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" })
    const data = await res.json()
    if (data.deactivated) {
      alert("Produk memiliki riwayat transaksi. Semua varian telah dinonaktifkan.")
    }
    load()
  }

  function toggleExpand(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function toggleVariantActive(product: Product, variantId: number) {
    const variants = product.variants.map((v) =>
      v.id === variantId ? { ...v, isActive: !v.isActive } : v,
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

  function updateCreateVariant(i: number, field: keyof EditVariantRow, val: string) {
    const vv = [...createForm.variants]
    ;(vv[i] as Record<string, unknown>)[field] = val
    setCreateForm({ ...createForm, variants: vv })
  }

  function updateEditVariant(i: number, field: keyof EditVariantRow, val: string | boolean) {
    const vv = [...editForm.variants]
    ;(vv[i] as Record<string, unknown>)[field] = val
    setEditForm({ ...editForm, variants: vv })
  }

  return {
    products,
    total,
    page,
    setPage,
    pageSize,
    setPageSize,
    stats,
    search,
    setSearch,
    filterCategory,
    setFilterCategory,
    filterSupplierId,
    setFilterSupplierId,
    filterStockStatus,
    setFilterStockStatus,
    filterDataStatus,
    setFilterDataStatus,
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    suppliers,
    categories,
    units,
    createOpen,
    setCreateOpen,
    editingProduct,
    setEditingProduct,
    expandedIds,
    loading,
    listLoading,
    createForm,
    setCreateForm,
    editForm,
    setEditForm,
    openEdit,
    handleCreate,
    handleSaveEdit,
    handleDelete,
    toggleExpand,
    toggleVariantActive,
    updateCreateVariant,
    updateEditVariant,
  }
}
