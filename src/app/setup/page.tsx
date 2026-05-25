"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { setupFormSchema } from "@/lib/validations/user"
import { z } from "zod"

type FieldErrors = z.inferFlattenedErrors<typeof setupFormSchema>["fieldErrors"]

export default function SetupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: "", email: "", password: "" })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    const parsed = setupFormSchema.safeParse(form)
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors)
      return
    }
    setFieldErrors({})
    setLoading(true)

    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 403) {
          router.push("/login")
          return
        }
        setError(typeof data.error === "string" ? data.error : "Gagal membuat akun")
        return
      }
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  const field = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">Selamat Datang di Kasir</h1>
          <p className="text-slate-400 text-sm mt-2">Buat akun admin pertama untuk memulai</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Nama</label>
            <input
              className={`w-full rounded-lg bg-slate-800 border text-white px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 ${fieldErrors.name ? "border-red-500" : "border-slate-700"}`}
              value={form.name}
              onChange={field("name")}
            />
            {fieldErrors.name && (
              <p className="text-red-400 text-xs mt-1">⚠ {fieldErrors.name[0]}</p>
            )}
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Username</label>
            <input
              type="text"
              className={`w-full rounded-lg bg-slate-800 border text-white px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 ${fieldErrors.email ? "border-red-500" : "border-slate-700"}`}
              value={form.email}
              onChange={field("email")}
            />
            {fieldErrors.email && (
              <p className="text-red-400 text-xs mt-1">⚠ {fieldErrors.email[0]}</p>
            )}
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Password</label>
            <input
              type="password"
              className={`w-full rounded-lg bg-slate-800 border text-white px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 ${fieldErrors.password ? "border-red-500" : "border-slate-700"}`}
              value={form.password}
              onChange={field("password")}
            />
            {fieldErrors.password && (
              <p className="text-red-400 text-xs mt-1">⚠ {fieldErrors.password[0]}</p>
            )}
          </div>
          {error && <p className="text-red-400 text-sm">⚠ {error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold text-sm transition-colors mt-2"
          >
            {loading ? "Membuat akun..." : "Buat Akun Admin"}
          </button>
        </form>
      </div>
    </div>
  )
}
