"use client"

import { useState, useEffect, useCallback } from "react"
import { Table, Thead, Tbody, Th, Td } from "@/components/ui/Table"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { formatDateShort } from "@/lib/format"

type User = { id: number; name: string; email: string; isActive: boolean; createdAt: string; role: { name: string } }

export default function PenggunaPage() {
  const [users, setUsers] = useState<User[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "EMPLOYEE" })

  const load = useCallback(async () => {
    const res = await fetch("/api/users")
    const data = await res.json()
    setUsers(data.users)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    setLoading(true)
    const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    setLoading(false)
    if (res.ok) { setModalOpen(false); setForm({ name: "", email: "", password: "", role: "EMPLOYEE" }); load() }
  }

  async function handleToggle(id: number, isActive: boolean) {
    await fetch(`/api/users/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !isActive }) })
    load()
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Pengguna</h1>
        <Button onClick={() => setModalOpen(true)}>+ Tambah Pengguna</Button>
      </div>
      <Table>
        <Thead><tr><Th>Nama</Th><Th>Email</Th><Th>Role</Th><Th>Status</Th><Th>Terdaftar</Th><Th /></tr></Thead>
        <Tbody>
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-gray-50">
              <Td className="font-medium">{u.name}</Td>
              <Td className="text-gray-500 text-sm">{u.email}</Td>
              <Td><Badge variant={u.role.name === "ADMIN" ? "warning" : "default"}>{u.role.name}</Badge></Td>
              <Td><Badge variant={u.isActive ? "success" : "danger"}>{u.isActive ? "Aktif" : "Nonaktif"}</Badge></Td>
              <Td className="text-gray-500 text-xs">{formatDateShort(u.createdAt)}</Td>
              <Td>
                <Button variant="secondary" className="text-xs py-1 px-2" onClick={() => handleToggle(u.id, u.isActive)}>
                  {u.isActive ? "Nonaktifkan" : "Aktifkan"}
                </Button>
              </Td>
            </tr>
          ))}
        </Tbody>
      </Table>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Tambah Pengguna">
        <div className="space-y-3">
          <Input label="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <div>
            <label className="text-sm font-medium text-gray-700">Role</label>
            <select className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="EMPLOYEE">Kasir (Employee)</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <Button onClick={handleCreate} loading={loading} className="w-full">Buat Pengguna</Button>
        </div>
      </Modal>
    </div>
  )
}
