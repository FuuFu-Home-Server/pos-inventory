"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Table, Thead, Tbody, Th, Td } from "@/components/ui/Table"

type Unit = { id: number; name: string }

export default function SatuanPage() {
  const [units, setUnits] = useState<Unit[]>([])
  const [newName, setNewName] = useState("")
  const [loading, setLoading] = useState(false)

  async function load() {
    const res = await fetch("/api/units")
    setUnits(await res.json())
  }

  useEffect(() => { load() }, [])

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

  async function handleDelete(id: number) {
    if (!confirm("Hapus satuan ini?")) return
    await fetch(`/api/units/${id}`, { method: "DELETE" })
    load()
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-black text-gray-900 mb-5">Satuan Produk</h1>

      <div className="flex gap-2 mb-6">
        <Input
          placeholder="Nama satuan baru..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="flex-1"
        />
        <Button onClick={handleAdd} loading={loading} disabled={!newName.trim()}>Tambah</Button>
      </div>

      <Table>
        <Thead>
          <tr><Th>Satuan</Th><Th /></tr>
        </Thead>
        <Tbody>
          {units.map((u) => (
            <tr key={u.id} className="hover:bg-gray-50">
              <Td className="font-medium">{u.name}</Td>
              <Td>
                <button
                  onClick={() => handleDelete(u.id)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Hapus
                </button>
              </Td>
            </tr>
          ))}
          {units.length === 0 && (
            <tr><Td colSpan={2} className="text-center text-gray-400 py-6">Belum ada satuan</Td></tr>
          )}
        </Tbody>
      </Table>
    </div>
  )
}
