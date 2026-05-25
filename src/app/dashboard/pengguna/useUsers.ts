"use client"

import { useState, useEffect, useCallback } from "react"
import { createUserSchema } from "@/lib/validations/user"
import { z } from "zod"

export type User = {
  id: number
  name: string
  email: string
  isActive: boolean
  createdAt: string
  role: { name: string }
}

export type FieldErrors = z.inferFlattenedErrors<typeof createUserSchema>["fieldErrors"]

export function useUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "EMPLOYEE" })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [apiError, setApiError] = useState("")

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
    setApiError("")
    const parsed = createUserSchema.safeParse(form)
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors)
      return
    }
    setFieldErrors({})
    setLoading(true)
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok) {
      setModalOpen(false)
      setForm({ name: "", email: "", password: "", role: "EMPLOYEE" })
      load()
    } else {
      setApiError(typeof data.error === "string" ? data.error : "Gagal membuat pengguna")
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

  function resetModal() {
    setModalOpen(false)
    setFieldErrors({})
    setApiError("")
    setForm({ name: "", email: "", password: "", role: "EMPLOYEE" })
  }

  return {
    users,
    modalOpen,
    setModalOpen: (open: boolean) => (open ? setModalOpen(true) : resetModal()),
    loading,
    listLoading,
    form,
    setForm,
    fieldErrors,
    apiError,
    handleCreate,
    handleToggle,
  }
}
