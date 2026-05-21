"use client"

import { useState, useEffect, useCallback } from "react"

export type Discount = {
  id: number
  name: string
  type: string
  value: number
  scope: string
  isActive: boolean
  minPurchase: number | null
  product: { name: string } | null
}
export type Product = { id: number; name: string }

export function useDiscounts() {
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: "",
    type: "PERCENT",
    value: "",
    scope: "TRANSACTION",
    productId: "",
    minPurchase: "",
    isActive: true,
  })

  const load = useCallback(async () => {
    const res = await fetch("/api/discounts")
    const data = await res.json()
    setDiscounts(data.discounts)
  }, [])

  useEffect(() => {
    load()
  }, [load])
  useEffect(() => {
    fetch("/api/products?limit=100")
      .then((r) => r.json())
      .then((d) => setProducts(d.products))
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
    await fetch(`/api/discounts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    })
    load()
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus diskon ini?")) return
    await fetch(`/api/discounts/${id}`, { method: "DELETE" })
    load()
  }

  return {
    discounts,
    products,
    modalOpen,
    setModalOpen,
    loading,
    form,
    setForm,
    handleCreate,
    handleToggle,
    handleDelete,
  }
}
