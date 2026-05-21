"use client"

import { useState, useEffect, useCallback } from "react"

export type Opname = { id: number; status: string; notes: string | null; createdAt: string; user: { name: string }; _count: { items: number } }
export type OpnameDetail = {
  id: number; status: string; notes: string | null; createdAt: string; user: { name: string }
  items: { id: number; systemQty: number; physicalQty: number; difference: number; productVariant: { variantName: string; unit: string; product: { name: string } } }[]
}

export function useStockOpname() {
  const [opnames, setOpnames] = useState<Opname[]>([])
  const [detail, setDetail] = useState<OpnameDetail | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch("/api/stock-opname")
    const data = await res.json()
    setOpnames(data.opnames)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    if (!confirm("Buat opname baru? Semua stok sistem saat ini akan di-snapshot.")) return
    setLoading(true)
    await fetch("/api/stock-opname", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
    setLoading(false)
    load()
  }

  async function openDetail(id: number) {
    const res = await fetch(`/api/stock-opname/${id}`)
    setDetail(await res.json())
  }

  async function handleUpdateItem(opnameId: number, itemId: number, physicalQty: number) {
    await fetch(`/api/stock-opname/${opnameId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-item", itemId, physicalQty }),
    })
  }

  async function handleConfirm(id: number) {
    if (!confirm("Konfirmasi opname? Stok sistem akan diperbarui sesuai stok fisik. Tindakan ini tidak bisa dibatalkan.")) return
    await fetch(`/api/stock-opname/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "confirm" }) })
    setDetail(null)
    load()
  }

  return { opnames, detail, setDetail, loading, handleCreate, openDetail, handleUpdateItem, handleConfirm }
}
