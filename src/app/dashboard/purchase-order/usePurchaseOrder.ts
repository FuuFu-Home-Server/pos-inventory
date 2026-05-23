"use client"

import { useState, useEffect, useCallback } from "react"
import { type PurchaseItem, type VariantResult } from "@/components/ui/PurchaseModal"

type POItem = {
  id: number
  qty: number
  unitCost: number
  subtotal: number
  productVariant: { variantName: string; unit: string; product: { name: string } }
}
type PO = {
  id: number
  status: string
  supplier: { name: string }
  user: { name: string }
  createdAt: string
  receivedAt: string | null
  _count: { items: number }
}
type PODetail = PO & { items: POItem[] }
type Supplier = { id: number; name: string }

export type { POItem, PO, PODetail, Supplier }

export function usePurchaseOrder() {
  const [orders, setOrders] = useState<PO[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [details, setDetails] = useState<Record<number, PODetail>>({})
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [form, setForm] = useState({ supplierId: "", notes: "", items: [] as PurchaseItem[] })

  const load = useCallback(async () => {
    setListLoading(true)
    const res = await fetch(`/api/purchase-orders?page=${page}&limit=${pageSize}`)
    const data = await res.json()
    setOrders(data.orders)
    setTotal(data.total)
    setListLoading(false)
  }, [page, pageSize])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((s) => setSuppliers(s.suppliers))
  }, [])

  async function searchVariants(q: string): Promise<VariantResult[]> {
    const res = await fetch(`/api/variants/search?q=${encodeURIComponent(q)}&includeZeroStock=true`)
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
          qty: "1",
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
        items: form.items.map((i) => ({
          productVariantId: i.variantId,
          qty: Number(i.qty),
          unitCost: Number(i.unitCost),
        })),
      }),
    })
    setLoading(false)
    setModalOpen(false)
    setForm({ supplierId: "", notes: "", items: [] })
    load()
  }

  async function handleStatus(id: number, status: string) {
    await fetch(`/api/purchase-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    load()
  }

  return {
    orders,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    expandedId,
    details,
    loadingId,
    modalOpen,
    setModalOpen,
    suppliers,
    form,
    setForm,
    loading,
    listLoading,
    searchVariants,
    handleAddVariant,
    toggleDetail,
    handleCreate,
    handleStatus,
  }
}
