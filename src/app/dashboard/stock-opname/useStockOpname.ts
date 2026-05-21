"use client"

import { useState, useEffect, useCallback, useRef } from "react"

export type Opname = {
  id: number
  status: string
  notes: string | null
  createdAt: string
  user: { name: string }
  _count: { items: number }
}
export type OpnameItem = {
  id: number
  systemQty: number
  physicalQty: number
  difference: number
  productVariant: { variantName: string; unit: string; product: { name: string } }
}
export type OpnameMeta = {
  id: number
  status: string
  notes: string | null
  createdAt: string
  user: { name: string }
}

const PAGE_LIMIT = 100

export function useStockOpname() {
  const [opnames, setOpnames] = useState<Opname[]>([])
  const [meta, setMeta] = useState<OpnameMeta | null>(null)
  const [items, setItems] = useState<OpnameItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [itemsLoading, setItemsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [localQtys, setLocalQtys] = useState<Record<number, number>>({})
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadList = useCallback(async () => {
    const res = await fetch("/api/stock-opname")
    const data = await res.json()
    setOpnames(data.opnames)
  }, [])

  useEffect(() => {
    loadList()
  }, [loadList])

  const loadItems = useCallback(async (id: number, p: number, q: string) => {
    setItemsLoading(true)
    const res = await fetch(
      `/api/stock-opname/${id}?page=${p}&limit=${PAGE_LIMIT}&q=${encodeURIComponent(q)}`,
    )
    const data = await res.json()
    setItems(data.items)
    setTotal(data.total)
    setItemsLoading(false)
    if (p === 1 && !q) {
      const qtys: Record<number, number> = {}
      data.items.forEach((i: OpnameItem) => {
        qtys[i.id] = i.physicalQty
      })
      setLocalQtys(qtys)
    } else {
      setLocalQtys((prev) => {
        const next = { ...prev }
        data.items.forEach((i: OpnameItem) => {
          if (!(i.id in next)) next[i.id] = i.physicalQty
        })
        return next
      })
    }
  }, [])

  async function openDetail(id: number) {
    setItemsLoading(true)
    const res = await fetch(`/api/stock-opname/${id}?page=1&limit=${PAGE_LIMIT}`)
    const data = await res.json()
    setMeta({
      id: data.id,
      status: data.status,
      notes: data.notes,
      createdAt: data.createdAt,
      user: data.user,
    })
    setItems(data.items)
    setTotal(data.total)
    setPage(1)
    setSearch("")
    const qtys: Record<number, number> = {}
    data.items.forEach((i: OpnameItem) => {
      qtys[i.id] = i.physicalQty
    })
    setLocalQtys(qtys)
    setItemsLoading(false)
  }

  function handleSearchChange(q: string) {
    setSearch(q)
    setPage(1)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      if (meta) loadItems(meta.id, 1, q)
    }, 250)
  }

  function handlePageChange(p: number) {
    setPage(p)
    if (meta) loadItems(meta.id, p, search)
  }

  function setLocalQty(itemId: number, qty: number) {
    setLocalQtys((prev) => ({ ...prev, [itemId]: qty }))
  }

  async function handleCreate() {
    if (!confirm("Buat opname baru? Semua stok sistem saat ini akan di-snapshot.")) return
    setLoading(true)
    await fetch("/api/stock-opname", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    setLoading(false)
    loadList()
  }

  async function handleSaveAll() {
    if (!meta) return
    const changed = Object.entries(localQtys).map(([id, physicalQty]) => ({
      itemId: Number(id),
      physicalQty,
    }))
    if (changed.length === 0) return
    setSaving(true)
    await fetch(`/api/stock-opname/${meta.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "batch-update", items: changed }),
    })
    if (meta) await loadItems(meta.id, page, search)
    setSaving(false)
  }

  async function handleSetAll(qty: number) {
    if (!meta) return
    setSaving(true)
    await fetch(`/api/stock-opname/${meta.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set-all", qty, q: search || undefined }),
    })
    await loadItems(meta.id, page, search)
    setSaving(false)
  }

  async function handleMatchPaste(lines: { name: string; qty: number }[]) {
    if (!meta) return null
    const res = await fetch(`/api/stock-opname/${meta.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "match-paste", lines }),
    })
    return res.json() as Promise<{
      matched: {
        itemId: number
        qty: number
        productName: string
        variantName: string
        unit: string
      }[]
      unmatched: string[]
    }>
  }

  function applyPasteMatches(matched: { itemId: number; qty: number }[]) {
    const updates: Record<number, number> = {}
    for (const { itemId, qty } of matched) updates[itemId] = qty
    setLocalQtys((prev) => ({ ...prev, ...updates }))
    if (meta) loadItems(meta.id, page, search)
  }

  async function handleConfirm() {
    if (!meta) return
    if (
      !confirm(
        "Konfirmasi opname? Stok sistem akan diperbarui sesuai stok fisik. Tindakan ini tidak bisa dibatalkan.",
      )
    )
      return
    await handleSaveAll()
    await fetch(`/api/stock-opname/${meta.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm" }),
    })
    setMeta(null)
    setItems([])
    loadList()
  }

  const changedCount = Object.keys(localQtys).length

  return {
    opnames,
    meta,
    setMeta,
    items,
    total,
    page,
    PAGE_LIMIT,
    loading,
    itemsLoading,
    saving,
    handleCreate,
    openDetail,
    handleSaveAll,
    handleSetAll,
    handleMatchPaste,
    applyPasteMatches,
    handleConfirm,
    localQtys,
    setLocalQty,
    setLocalQtys,
    search,
    handleSearchChange,
    handlePageChange,
    changedCount,
  }
}
