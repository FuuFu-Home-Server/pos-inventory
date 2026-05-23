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
  const [listLoading, setListLoading] = useState(true)

  async function load() {
    setListLoading(true)
    const res = await fetch("/api/categories")
    setCategories(await res.json())
    setListLoading(false)
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
          {listLoading && (
            <tr>
              <Td colSpan={4} className="py-10 text-center">
                <div className="inline-flex items-center gap-2 text-gray-400 text-sm">
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  Memuat...
                </div>
              </Td>
            </tr>
          )}
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
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    className="text-xs py-1 px-2"
                    onClick={() => handleDelete(c.id)}
                    disabled={c.productCount > 0}
                    title={c.productCount > 0 ? "Tidak bisa hapus — ada produk terkait" : "Hapus"}
                  >
                    Hapus
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
          {!listLoading && categories.length === 0 && (
            <tr>
              <Td colSpan={4} className="text-center text-gray-400 py-10">
                Belum ada kategori
              </Td>
            </tr>
          )}
        </Tbody>
      </Table>
    </div>
  )
}
