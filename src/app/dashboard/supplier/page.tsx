"use client"

import { useState, useEffect, useCallback } from "react"
import { Table, Thead, Tbody, Th, Td } from "@/components/ui/Table"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"

type Supplier = { id: number; name: string; phone: string | null; address: string | null; contactPerson: string | null }

const emptyForm = { name: "", phone: "", address: "", contactPerson: "" }

export default function SupplierPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/suppliers?q=${encodeURIComponent(search)}`)
    const data = await res.json()
    setSuppliers(data.suppliers)
  }, [search])

  useEffect(() => { load() }, [load])

  function openCreate() { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  function openEdit(s: Supplier) { setEditing(s); setForm({ name: s.name, phone: s.phone ?? "", address: s.address ?? "", contactPerson: s.contactPerson ?? "" }); setModalOpen(true) }

  async function handleSave() {
    setLoading(true)
    const url = editing ? `/api/suppliers/${editing.id}` : "/api/suppliers"
    const method = editing ? "PUT" : "POST"
    const body = { name: form.name, phone: form.phone || null, address: form.address || null, contactPerson: form.contactPerson || null }
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    setLoading(false)
    setModalOpen(false)
    load()
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus supplier ini?")) return
    await fetch(`/api/suppliers/${id}`, { method: "DELETE" })
    load()
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Supplier</h1>
        <Button onClick={openCreate}>+ Tambah Supplier</Button>
      </div>
      <div className="mb-4 max-w-sm">
        <Input placeholder="Cari supplier..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Table>
        <Thead>
          <tr>
            <Th>Nama</Th><Th>Telepon</Th><Th>Kontak</Th><Th>Alamat</Th><Th />
          </tr>
        </Thead>
        <Tbody>
          {suppliers.map((s) => (
            <tr key={s.id} className="hover:bg-gray-50">
              <Td><span className="font-medium">{s.name}</span></Td>
              <Td className="text-gray-500">{s.phone ?? "—"}</Td>
              <Td className="text-gray-500">{s.contactPerson ?? "—"}</Td>
              <Td className="text-gray-500 text-xs">{s.address ?? "—"}</Td>
              <Td>
                <div className="flex gap-2">
                  <Button variant="secondary" className="text-xs py-1 px-2" onClick={() => openEdit(s)}>Edit</Button>
                  <Button variant="danger" className="text-xs py-1 px-2" onClick={() => handleDelete(s.id)}>Hapus</Button>
                </div>
              </Td>
            </tr>
          ))}
        </Tbody>
      </Table>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Supplier" : "Tambah Supplier"}>
        <div className="space-y-3">
          <Input label="Nama Supplier" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Telepon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Nama Kontak" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
          <Input label="Alamat" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Button onClick={handleSave} loading={loading} className="w-full">Simpan</Button>
        </div>
      </Modal>
    </div>
  )
}
