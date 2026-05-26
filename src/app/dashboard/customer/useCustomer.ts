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

export function useCustomer(confirm: (msg: string) => Promise<boolean>) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)

  const load = useCallback(async () => {
    setListLoading(true)
    const res = await fetch(
      `/api/customers?q=${encodeURIComponent(search)}&page=${page}&limit=${pageSize}`,
    )
    const data = await res.json()
    setCustomers(data.customers)
    setTotal(data.total ?? data.customers.length)
    setListLoading(false)
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
    if (
      !(await confirm({
        message: "Hapus pelanggan ini?",
        description: "Data pelanggan akan dihapus permanen dan tidak dapat dikembalikan.",
      }))
    )
      return
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
    listLoading,
    openCreate,
    openEdit,
    handleSave,
    handleDelete,
  }
}
