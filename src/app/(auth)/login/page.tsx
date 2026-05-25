"use client"

import { useState, useEffect, FormEvent } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { ShoppingCart } from "lucide-react"
import { loginSchema } from "@/lib/validations/user"
import { z } from "zod"

type FieldErrors = z.inferFlattenedErrors<typeof loginSchema>["fieldErrors"]

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    fetch("/api/setup")
      .then((r) => r.json())
      .then((data) => {
        if (data.needsSetup) router.replace("/setup")
      })
      .catch(() => {})
  }, [router])

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")

    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors)
      return
    }
    setFieldErrors({})
    setLoading(true)

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError("Username atau kata sandi salah.")
      return
    }

    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-1/2 bg-slate-900 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
            <ShoppingCart size={20} className="text-white" />
          </div>
          <span className="text-white font-bold text-xl">Kasir</span>
        </div>

        <div>
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            POS & Manajemen
            <br />
            Inventori Modern
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            Kelola penjualan, stok, dan laporan bisnis
            <br />
            dalam satu platform terintegrasi.
          </p>
        </div>

        <div className="flex gap-6">
          {[
            { n: "200+", label: "Transaksi/hari" },
            { n: "99.9%", label: "Uptime" },
            { n: "Realtime", label: "Laporan" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-white font-black text-xl">{s.n}</p>
              <p className="text-slate-500 text-xs">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
              <ShoppingCart size={18} className="text-white" />
            </div>
            <span className="font-black text-xl text-gray-900">Kasir</span>
          </div>

          <h1 className="text-2xl font-black text-gray-900 mb-1">Selamat datang</h1>
          <p className="text-gray-500 text-sm mb-8">Masuk untuk melanjutkan ke sistem kasir</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              id="email"
              type="text"
              label="Username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="username"
              autoFocus
              error={fieldErrors.email?.[0]}
            />
            <Input
              id="password"
              type="password"
              label="Kata Sandi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              error={fieldErrors.password?.[0]}
            />

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
                <span>⚠</span> {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full py-3 text-base mt-2">
              Masuk ke Sistem
            </Button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-6">Sistem POS & Inventori · v1.0</p>
        </div>
      </div>
    </div>
  )
}
