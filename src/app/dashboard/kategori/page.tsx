"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Table, Thead, Tbody, Th, Td } from "@/components/ui/Table"
import { Toggle } from "@/components/ui/Toggle"
import { Badge } from "@/components/ui/Badge"

type Category = { id: number; name: string; isActive: boolean; productCount: number }

export default function KategoriPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [newName, setNewName] = useState("")
  const [loading, setLoading] = useState(false)

  async function load() {
    const res = await fetch("/api/categories")
    setCategories(await res.json())
  }

  useEffect(() => {
    load()
  }, [])

  async function handleAdd() {
    if (!newName.trim()) return
    setLoading(true)
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    })
    setNewName("")
    setLoading(false)
    load()
  }

  async function handleToggle(id: number, isActive: boolean) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, isActive } : c)))
    await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    })
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus kategori ini?")) return
    await fetch(`/api/categories/${id}`, { method: "DELETE" })
    load()
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl font-black md:text-2xl text-gray-900 mb-5">Kategori Produk</h1>

      <div className="flex gap-2 mb-6">
        <Input
          placeholder="Nama kategori baru..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="flex-1"
        />
        <Button onClick={handleAdd} loading={loading} disabled={!newName.trim()}>
          Tambah
        </Button>
      </div>

      <Table>
        <Thead>
          <tr>
            <Th>Kategori</Th>
            <Th>Produk</Th>
            <Th>Status</Th>
            <Th />
          </tr>
        </Thead>
        <Tbody>
          {categories.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50">
              <Td className="font-medium">{c.name}</Td>
              <Td>
                <Badge variant="info">{c.productCount} produk</Badge>
              </Td>
              <Td>
                <Toggle
                  checked={c.isActive}
                  onChange={(v) => handleToggle(c.id, v)}
                  label={c.isActive ? "Aktif" : "Nonaktif"}
                  size="sm"
                />
              </Td>
              <Td>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-40"
                  disabled={c.productCount > 0}
                  title={c.productCount > 0 ? "Tidak bisa hapus — ada produk terkait" : "Hapus"}
                >
                  Hapus
                </button>
              </Td>
            </tr>
          ))}
          {categories.length === 0 && (
            <tr>
              <Td colSpan={4} className="text-center text-gray-400 py-6">
                Belum ada kategori
              </Td>
            </tr>
          )}
        </Tbody>
      </Table>
    </div>
  )
}
