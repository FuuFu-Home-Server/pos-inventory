"use client"

import { useState, useEffect, useCallback } from "react"

export type Customer = {
  id: number
  name: string
  phone: string | null
  address: string | null
  createdAt: string
}

const emptyForm = { name: "", phone: "", address: "" }

export function useCustomer() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/customers?q=${encodeURIComponent(search)}&page=${page}&limit=${pageSize}`,
    )
    const data = await res.json()
    setCustomers(data.customers)
    setTotal(data.total ?? data.customers.length)
  }, [search, page, pageSize])

  useEffect(() => {
    load()
  }, [load])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }
  function openEdit(c: Customer) {
    setEditing(c)
    setForm({ name: c.name, phone: c.phone ?? "", address: c.address ?? "" })
    setModalOpen(true)
  }

  async function handleSave() {
    setLoading(true)
    const url = editing ? `/api/customers/${editing.id}` : "/api/customers"
    const method = editing ? "PUT" : "POST"
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        phone: form.phone || null,
        address: form.address || null,
      }),
    })
    setLoading(false)
    setModalOpen(false)
    load()
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus pelanggan ini?")) return
    await fetch(`/api/customers/${id}`, { method: "DELETE" })
    load()
  }

  return {
    customers,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    search,
    setSearch,
    modalOpen,
    setModalOpen,
    editing,
    form,
    setForm,
    loading,
    openCreate,
    openEdit,
    handleSave,
    handleDelete,
  }
}
