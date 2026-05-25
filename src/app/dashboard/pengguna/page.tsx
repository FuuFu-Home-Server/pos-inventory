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
  const {
    users,
    modalOpen,
    setModalOpen,
    loading,
    listLoading,
    form,
    setForm,
    fieldErrors,
    apiError,
    handleCreate,
    handleToggle,
  } = useUsers()

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
        <div>
          <h1 className="text-xl font-black md:text-2xl text-gray-900">Pengguna</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} pengguna terdaftar</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ Tambah Pengguna</Button>
      </div>
      <Table>
        <Thead>
          <tr>
            <Th>Nama</Th>
            <Th>Username</Th>
            <Th>Role</Th>
            <Th>Status</Th>
            <Th>Terdaftar</Th>
            <Th />
          </tr>
        </Thead>
        <Tbody>
          {listLoading && (
            <tr>
              <Td colSpan={6} className="py-10 text-center">
                <div className="inline-flex items-center gap-2 text-gray-400 text-sm">
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  Memuat...
                </div>
              </Td>
            </tr>
          )}
          {!listLoading && users.length === 0 && (
            <tr>
              <Td colSpan={6} className="py-10 text-center text-gray-400">
                Belum ada pengguna
              </Td>
            </tr>
          )}
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-gray-50">
              <Td className="font-medium">{u.name}</Td>
              <Td className="text-gray-500 text-sm">{u.email}</Td>
              <Td>
                <Badge variant={u.role.name === "ADMIN" ? "warning" : "default"}>
                  {u.role.name === "ADMIN" ? "Admin" : "Kasir"}
                </Badge>
              </Td>
              <Td>
                <Badge variant={u.isActive ? "success" : "danger"}>
                  {u.isActive ? "Aktif" : "Nonaktif"}
                </Badge>
              </Td>
              <Td className="text-gray-500 text-xs">{formatDateShort(u.createdAt)}</Td>
              <Td>
                <Button
                  variant="secondary"
                  className="text-xs py-1 px-2"
                  onClick={() => handleToggle(u.id, u.isActive)}
                >
                  {u.isActive ? "Nonaktifkan" : "Aktifkan"}
                </Button>
              </Td>
            </tr>
          ))}
        </Tbody>
      </Table>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Tambah Pengguna">
        <div className="space-y-3">
          <Input
            label="Nama"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={fieldErrors.name?.[0]}
          />
          <Input
            label="Username"
            type="text"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={fieldErrors.email?.[0]}
          />
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            error={fieldErrors.password?.[0]}
          />
          {apiError && <p className="text-sm text-red-600">⚠ {apiError}</p>}
          <Select
            label="Role"
            value={form.role}
            onChange={(v) => setForm({ ...form, role: v })}
            options={[
              { value: "EMPLOYEE", label: "Kasir (Employee)" },
              { value: "ADMIN", label: "Admin" },
            ]}
          />
          <Button onClick={handleCreate} loading={loading} className="w-full">
            Buat Pengguna
          </Button>
        </div>
      </Modal>
    </div>
  )
}
