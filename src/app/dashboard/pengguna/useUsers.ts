"use client"

import { useState, useEffect, useCallback } from "react"

export type User = {
  id: number
  name: string
  email: string
  isActive: boolean
  createdAt: string
  role: { name: string }
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "EMPLOYEE" })

  const load = useCallback(async () => {
    setListLoading(true)
    const res = await fetch("/api/users")
    const data = await res.json()
    setUsers(data.users)
    setListLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate() {
    setLoading(true)
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setLoading(false)
    if (res.ok) {
      setModalOpen(false)
      setForm({ name: "", email: "", password: "", role: "EMPLOYEE" })
      load()
    }
  }

  async function handleToggle(id: number, isActive: boolean) {
    await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    })
    load()
  }

  return {
    users,
    modalOpen,
    setModalOpen,
    loading,
    listLoading,
    form,
    setForm,
    handleCreate,
    handleToggle,
  }
}
