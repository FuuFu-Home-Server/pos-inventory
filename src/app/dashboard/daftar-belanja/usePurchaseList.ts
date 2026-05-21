"use client"

import { useState, useEffect, useCallback } from "react"
import { type PurchaseItem, type VariantResult } from "@/components/ui/PurchaseModal"

export type ListItem = { id: number; productName: string; variantName: string; unit: string; qtyPerUnit: number; qty: number; unitCost: number; isPurchased: boolean; productVariantId: number | null }
export type PurchaseList = { id: number; title: string; notes: string | null; status: string; createdAt: string; totalCost: number; purchasedCount: number; _count: { items: number } }
export type PurchaseListDetail = PurchaseList & { items: ListItem[] }
export type LowStockVariant = { id: number; variantName: string; unit: string; stock: number; lowStockThreshold: number; costPrice: number | null; product: { name: string } }

export function usePurchaseList() {
  const [lists, setLists] = useState<PurchaseList[]>([])
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [details, setDetails] = useState<Record<number, PurchaseListDetail>>({})
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [lowStock, setLowStock] = useState<LowStockVariant[]>([])
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({ title: "", notes: "", items: [] as PurchaseItem[] })
  const [allVariants, setAllVariants] = useState<VariantResult[]>([])

  const load = useCallback(async () => {
    const res = await fetch("/api/purchase-lists")
    setLists(await res.json())
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch("/api/products?limit=200").then((r) => r.json()).then((data) => {
      const vs: VariantResult[] = data.products.flatMap((p: any) =>
        p.variants.map((v: any) => ({ ...v, product: { name: p.name } }))
      )
      setAllVariants(vs)
      const ls: LowStockVariant[] = data.products.flatMap((p: any) =>
        p.variants
          .filter((v: any) => v.stock <= v.lowStockThreshold)
          .map((v: any) => ({ id: v.id, variantName: v.variantName, unit: v.unit, stock: v.stock, lowStockThreshold: v.lowStockThreshold, costPrice: v.costPrice ?? null, product: { name: p.name } }))
      )
      setLowStock(ls)
    })
  }, [])

  function handleAddVariant(v: VariantResult) {
    setForm((f) => ({
      ...f,
      items: [...f.items, {
        variantId: v.id,
        label: `${v.product.name} — ${v.variantName}`,
        unit: v.unit,
        qtyPerUnit: "1",
        qty: "1",
        unitCost: String(v.costPrice ?? ""),
      }],
    }))
  }

  function addLowStockToForm(v: LowStockVariant) {
    if (form.items.some((i) => i.variantId === v.id)) return
    setForm((f) => ({
      ...f,
      items: [...f.items, {
        variantId: v.id,
        label: `${v.product.name} — ${v.variantName}`,
        unit: v.unit,
        qtyPerUnit: "1",
        qty: String(Math.max(1, v.lowStockThreshold - v.stock + v.lowStockThreshold)),
        unitCost: String(v.costPrice ?? ""),
      }],
    }))
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

  async function searchVariants(q: string): Promise<VariantResult[]> {
    if (!q.trim()) return allVariants.slice(0, 10)
    const q2 = q.toLowerCase()
    return allVariants.filter((v) =>
      v.product.name.toLowerCase().includes(q2) || v.variantName.toLowerCase().includes(q2)
    ).slice(0, 10)
  }

  return {
    lists, expandedId, details, loadingId,
    modalOpen, setModalOpen,
    lowStock, loading,
    form, setForm,
    searchVariants, handleAddVariant, addLowStockToForm,
    toggleDetail, handleCreate, toggleItemPurchased,
    handleDelete, markDone,
  }
}
