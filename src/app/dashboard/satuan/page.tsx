"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Table, Thead, Tbody, Th, Td } from "@/components/ui/Table"
import { Toggle } from "@/components/ui/Toggle"
import { useConfirm } from "@/hooks/useConfirm"

type Unit = { id: number; name: string; isActive: boolean }

export default function SatuanPage() {
  const { confirm, dialog } = useConfirm()
  const [units, setUnits] = useState<Unit[]>([])
  const [newName, setNewName] = useState("")
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)

  async function load() {
    setListLoading(true)
    const res = await fetch("/api/units")
    setUnits(await res.json())
    setListLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleAdd() {
    if (!newName.trim()) return
    setLoading(true)
    await fetch("/api/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    })
    setNewName("")
    setLoading(false)
    load()
  }

  async function handleToggle(id: number, isActive: boolean) {
    setUnits((prev) => prev.map((u) => (u.id === id ? { ...u, isActive } : u)))
    await fetch(`/api/units/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    })
  }

  async function handleDelete(id: number) {
    if (!(await confirm("Hapus satuan ini?"))) return
    await fetch(`/api/units/${id}`, { method: "DELETE" })
    load()
  }

  return (
    <div className="p-4 md:p-6">
      {dialog}
      <div className="mb-5">
        <h1 className="text-xl font-black md:text-2xl text-gray-900">Satuan Produk</h1>
        <p className="text-sm text-gray-500 mt-0.5">{units.length} satuan terdaftar</p>
      </div>

      <div className="flex gap-2 mb-6">
        <Input
          placeholder="Nama satuan baru..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="flex-1"
        />
        <Button onClick={handleAdd} loading={loading} disabled={!newName.trim()}>
          Tambah
        </Button>
      </div>

      <Table minWidth="">
        <Thead>
          <tr>
            <Th>Satuan</Th>
            <Th>Status</Th>
            <Th />
          </tr>
        </Thead>
        <Tbody>
          {listLoading && (
            <tr>
              <Td colSpan={3} className="py-10 text-center">
                <div className="inline-flex items-center gap-2 text-gray-400 text-sm">
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  Memuat...
                </div>
              </Td>
            </tr>
          )}
          {units.map((u) => (
            <tr key={u.id} className="hover:bg-gray-50">
              <Td className="font-medium">{u.name}</Td>
              <Td>
                <Toggle
                  checked={u.isActive}
                  onChange={(v) => handleToggle(u.id, v)}
                  label={u.isActive ? "Aktif" : "Nonaktif"}
                  size="sm"
                />
              </Td>
              <Td>
                <div className="flex gap-2">
                  <Button size="sm" variant="danger" onClick={() => handleDelete(u.id)}>
                    Hapus
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
          {!listLoading && units.length === 0 && (
            <tr>
              <Td colSpan={3} className="text-center text-gray-400 py-10">
                Belum ada satuan
              </Td>
            </tr>
          )}
        </Tbody>
      </Table>
    </div>
  )
}
