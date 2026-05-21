"use client"

import { useState, useEffect, useCallback } from "react"
import { Table, Thead, Tbody, Th, Td } from "@/components/ui/Table"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { formatDateShort } from "@/lib/format"

type Customer = { id: number; name: string; phone: string | null; address: string | null; createdAt: string }

const emptyForm = { name: "", phone: "", address: "" }

export default function CustomerPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/customers?q=${encodeURIComponent(search)}`)
    const data = await res.json()
    setCustomers(data.customers)
  }, [search])

  useEffect(() => { load() }, [load])

  function openCreate() { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  function openEdit(c: Customer) { setEditing(c); setForm({ name: c.name, phone: c.phone ?? "", address: c.address ?? "" }); setModalOpen(true) }

  async function handleSave() {
    setLoading(true)
    const url = editing ? `/api/customers/${editing.id}` : "/api/customers"
    const method = editing ? "PUT" : "POST"
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, phone: form.phone || null, address: form.address || null }) })
    setLoading(false)
    setModalOpen(false)
    load()
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus pelanggan ini?")) return
    await fetch(`/api/customers/${id}`, { method: "DELETE" })
    load()
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Pelanggan</h1>
        <Button onClick={openCreate}>+ Tambah Pelanggan</Button>
      </div>
      <div className="mb-4 max-w-sm">
        <Input placeholder="Cari nama atau nomor HP..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Table>
        <Thead><tr><Th>Nama</Th><Th>No. HP</Th><Th>Alamat</Th><Th>Terdaftar</Th><Th /></tr></Thead>
        <Tbody>
          {customers.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50">
              <Td><span className="font-medium">{c.name}</span></Td>
              <Td className="text-gray-500">{c.phone ?? "—"}</Td>
              <Td className="text-gray-500 text-xs">{c.address ?? "—"}</Td>
              <Td className="text-gray-500 text-xs">{formatDateShort(c.createdAt)}</Td>
              <Td>
                <div className="flex gap-2">
                  <Button variant="secondary" className="text-xs py-1 px-2" onClick={() => openEdit(c)}>Edit</Button>
                  <Button variant="danger" className="text-xs py-1 px-2" onClick={() => handleDelete(c.id)}>Hapus</Button>
                </div>
              </Td>
            </tr>
          ))}
        </Tbody>
      </Table>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Pelanggan" : "Tambah Pelanggan"}>
        <div className="space-y-3">
          <Input label="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="No. HP" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Alamat" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Button onClick={handleSave} loading={loading} className="w-full">Simpan</Button>
        </div>
      </Modal>
    </div>
  )
}
