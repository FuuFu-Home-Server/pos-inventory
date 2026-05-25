"use client"

import { useState, useEffect, useCallback } from "react"

export type Supplier = {
  id: number
  name: string
  phone: string | null
  address: string | null
  contactPerson: string | null
}

const emptyForm = { name: "", phone: "", address: "", contactPerson: "" }

export function useSupplier(confirm: (msg: string) => Promise<boolean>) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)

  const load = useCallback(async () => {
    setListLoading(true)
    const res = await fetch(
      `/api/suppliers?q=${encodeURIComponent(search)}&page=${page}&limit=${pageSize}`,
    )
    const data = await res.json()
    setSuppliers(data.suppliers)
    setTotal(data.total ?? data.suppliers.length)
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
  function openEdit(s: Supplier) {
    setEditing(s)
    setForm({
      name: s.name,
      phone: s.phone ?? "",
      address: s.address ?? "",
      contactPerson: s.contactPerson ?? "",
    })
    setModalOpen(true)
  }

  async function handleSave() {
    setLoading(true)
    const url = editing ? `/api/suppliers/${editing.id}` : "/api/suppliers"
    const method = editing ? "PUT" : "POST"
    const body = {
      name: form.name,
      phone: form.phone || null,
      address: form.address || null,
      contactPerson: form.contactPerson || null,
    }
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    setLoading(false)
    setModalOpen(false)
    load()
  }

  async function handleDelete(id: number) {
    if (!(await confirm("Hapus supplier ini?"))) return
    await fetch(`/api/suppliers/${id}`, { method: "DELETE" })
    load()
  }

  return {
    suppliers,
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
