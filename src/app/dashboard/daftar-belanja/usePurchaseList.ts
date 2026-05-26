"use client"

import { useState, useEffect, useCallback } from "react"
import { type PurchaseItem, type VariantResult } from "@/components/ui/PurchaseModal"

export type ListItem = {
  id: number
  productName: string
  variantName: string
  unit: string
  qtyPerUnit: number
  qty: number
  unitCost: number
  isPurchased: boolean
  productVariantId: number | null
}
export type PurchaseList = {
  id: number
  title: string
  notes: string | null
  status: string
  createdAt: string
  totalCost: number
  purchasedCount: number
  _count: { items: number }
}
export type PurchaseListDetail = PurchaseList & {
  items: ListItem[]
  images?: { id: number; filename: string; createdAt: string }[]
}
export type LowStockVariant = {
  id: number
  variantName: string
  unit: string
  stock: number
  lowStockThreshold: number
  costPrice: number | null
  product: { name: string }
}

export function usePurchaseList(
  confirm: (msg: string | { message: string; description?: string }) => Promise<boolean>,
) {
  const [lists, setLists] = useState<PurchaseList[]>([])
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [details, setDetails] = useState<Record<number, PurchaseListDetail>>({})
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [lowStock, setLowStock] = useState<LowStockVariant[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ title: "", notes: "", items: [] as PurchaseItem[] })

  const load = useCallback(async () => {
    const res = await fetch("/api/purchase-lists")
    setLists(await res.json())
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    fetch("/api/variants/low-stock")
      .then((r) => r.json())
      .then(setLowStock)
  }, [])

  async function searchVariants(q: string): Promise<VariantResult[]> {
    const res = await fetch(`/api/variants/search?q=${encodeURIComponent(q)}`)
    return res.json()
  }

  function handleAddVariant(v: VariantResult) {
    setForm((f) => ({
      ...f,
      items: [
        ...f.items,
        {
          variantId: v.id,
          label: `${v.productName} — ${v.variantName}`,
          unit: v.unit,
          qtyPerUnit: "1",
          qty: "1",
          unitCost: String(v.costPrice ?? ""),
        },
      ],
    }))
  }

  function addLowStockToForm(v: LowStockVariant) {
    if (form.items.some((i) => i.variantId === v.id)) return
    setForm((f) => ({
      ...f,
      items: [
        ...f.items,
        {
          variantId: v.id,
          label: `${v.product.name} — ${v.variantName}`,
          unit: v.unit,
          qtyPerUnit: "1",
          qty: String(Math.max(1, v.lowStockThreshold - v.stock + v.lowStockThreshold)),
          unitCost: String(v.costPrice ?? ""),
        },
      ],
    }))
  }

  async function toggleDetail(id: number) {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
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
          productVariantId: i.variantId,
          productName: i.label.split(" — ")[0],
          variantName: i.label.split(" — ")[1] ?? "",
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
      return {
        ...prev,
        [listId]: {
          ...prev[listId],
          items: prev[listId].items.map((i) => (i.id === itemId ? { ...i, isPurchased } : i)),
        },
      }
    })
    await fetch(`/api/purchase-lists/${listId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, isPurchased }),
    })
    load()
  }

  async function handleDelete(id: number) {
    if (
      !(await confirm({
        message: "Hapus daftar belanja ini?",
        description: "Daftar belanja dan semua item di dalamnya akan dihapus permanen.",
      }))
    )
      return
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

  async function completeToPO(
    id: number,
  ): Promise<{ purchaseOrderId: number; skippedItems: number } | null> {
    const res = await fetch(`/api/purchase-lists/${id}/complete`, { method: "POST" })
    if (!res.ok) return null
    const data: { purchaseOrderId: number; skippedItems: number } = await res.json()
    load()
    return data
  }

  async function createProductForList(data: {
    name: string
    category: string
    variantName: string
    unit: string
    costPrice: number
  }): Promise<import("@/components/ui/PurchaseModal").VariantResult | null> {
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        category: data.category,
        supplierId: null,
        variants: [
          {
            variantName: data.variantName || "Default",
            barcode: null,
            price: data.costPrice,
            stock: 0,
            unit: data.unit,
            lowStockThreshold: 5,
          },
        ],
      }),
    })
    if (!res.ok) return null
    const product: {
      id: number
      name: string
      variants: Array<{
        id: number
        variantName: string
        unit: string
        price: number
        costPrice: number | null
        stock: number
      }>
    } = await res.json()
    const v = product.variants[0]
    return {
      id: v.id,
      productId: product.id,
      productName: product.name,
      variantName: v.variantName,
      unit: v.unit,
      price: v.price,
      costPrice: data.costPrice,
      stock: 0,
      barcode: null,
    }
  }

  async function createVariantForList(
    productId: number,
    data: { variantName: string; unit: string; costPrice: number },
  ): Promise<import("@/components/ui/PurchaseModal").VariantResult | null> {
    const res = await fetch(`/api/products/${productId}/variants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        variantName: data.variantName,
        unit: data.unit,
        costPrice: data.costPrice,
        price: 0,
      }),
    })
    if (!res.ok) return null
    const v: {
      id: number
      productId: number
      productName: string
      variantName: string
      unit: string
      costPrice: number | null
      stock: number
    } = await res.json()
    return {
      id: v.id,
      productId: v.productId,
      productName: v.productName,
      variantName: v.variantName,
      unit: v.unit,
      price: 0,
      costPrice: data.costPrice,
      stock: 0,
      barcode: null,
    }
  }

  async function reloadDetail(id: number) {
    const res = await fetch(`/api/purchase-lists/${id}`)
    if (!res.ok) return
    const data = await res.json()
    setDetails((prev) => ({ ...prev, [id]: data }))
  }

  async function uploadImage(listId: number, file: File) {
    const { compressImage } = await import("@/lib/image-compress")
    const compressed = await compressImage(file)
    const form = new FormData()
    form.append("file", compressed, file.name.replace(/\.[^.]+$/, ".jpg"))
    await fetch(`/api/purchase-lists/${listId}/images`, { method: "POST", body: form })
    await reloadDetail(listId)
  }

  async function deleteImage(listId: number, imageId: number) {
    await fetch(`/api/purchase-lists/${listId}/images/${imageId}`, { method: "DELETE" })
    await reloadDetail(listId)
  }

  return {
    lists,
    expandedId,
    details,
    loadingId,
    modalOpen,
    setModalOpen,
    lowStock,
    loading,
    form,
    setForm,
    searchVariants,
    handleAddVariant,
    addLowStockToForm,
    toggleDetail,
    handleCreate,
    toggleItemPurchased,
    handleDelete,
    markDone,
    completeToPO,
    createProductForList,
    createVariantForList,
    reloadDetail,
    uploadImage,
    deleteImage,
  }
}
