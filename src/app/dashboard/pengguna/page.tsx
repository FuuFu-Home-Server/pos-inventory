"use client"

import { Table, Thead, Tbody, Th, Td } from "@/components/ui/Table"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { Select } from "@/components/ui/Select"
import { formatDateShort } from "@/lib/format"
import { useUsers } from "./useUsers"

export default function PenggunaPage() {
  const { users, modalOpen, setModalOpen, loading, form, setForm, handleCreate, handleToggle } = useUsers()

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
              <Td><Badge variant={u.role.name === "ADMIN" ? "warning" : "default"}>{u.role.name === "ADMIN" ? "Admin" : "Kasir"}</Badge></Td>
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
          <Select
            label="Role"
            value={form.role}
            onChange={(v) => setForm({ ...form, role: v })}
            options={[{ value: "EMPLOYEE", label: "Kasir (Employee)" }, { value: "ADMIN", label: "Admin" }]}
          />
          <Button onClick={handleCreate} loading={loading} className="w-full">Buat Pengguna</Button>
        </div>
      </Modal>
    </div>
  )
}
