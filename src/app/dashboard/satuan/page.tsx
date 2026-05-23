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

  async function handleDelete(id: number) {
    if (!confirm("Hapus satuan ini?")) return
    await fetch(`/api/units/${id}`, { method: "DELETE" })
    load()
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl font-black md:text-2xl text-gray-900 mb-5">Satuan Produk</h1>

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
            <Th />
          </tr>
        </Thead>
        <Tbody>
          {listLoading && (
            <tr>
              <Td colSpan={2} className="py-10 text-center">
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
              <Td className="text-right">
                <Button
                  variant="danger"
                  className="text-xs py-1 px-2"
                  onClick={() => handleDelete(u.id)}
                >
                  Hapus
                </Button>
              </Td>
            </tr>
          ))}
          {!listLoading && units.length === 0 && (
            <tr>
              <Td colSpan={2} className="text-center text-gray-400 py-10">
                Belum ada satuan
              </Td>
            </tr>
          )}
        </Tbody>
      </Table>
    </div>
  )
}
