"use client"

import { Table, Thead, Tbody, Th, Td } from "@/components/ui/Table"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { Pagination } from "@/components/ui/Pagination"
import { formatDateShort } from "@/lib/format"
import { Users } from "lucide-react"
import { useCustomer } from "./useCustomer"

export default function CustomerPage() {
  const {
    customers,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    search,
    setSearch,
    modalOpen,
    setModalOpen,
    editing,
    form,
    setForm,
    loading,
    openCreate,
    openEdit,
    handleSave,
    handleDelete,
  } = useCustomer()

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
        <div>
          <h1 className="text-xl font-black md:text-2xl text-gray-900">Pelanggan</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} pelanggan terdaftar</p>
        </div>
        <Button onClick={openCreate}>+ Tambah Pelanggan</Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 mb-4 max-w-xs">
        <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
          <Users size={16} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">Total Pelanggan</p>
          <p className="text-base font-black text-gray-900 tabular-nums md:text-xl">{total}</p>
        </div>
      </div>

      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Cari nama atau nomor HP..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
      </div>

      <Table>
        <Thead>
          <tr>
            <Th>Nama</Th>
            <Th>No. HP</Th>
            <Th>Alamat</Th>
            <Th>Terdaftar</Th>
            <Th />
          </tr>
        </Thead>
        <Tbody>
          {customers.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50">
              <Td>
                <span className="font-medium">{c.name}</span>
              </Td>
              <Td className="text-gray-500">{c.phone ?? "—"}</Td>
              <Td className="text-gray-500 text-xs">{c.address ?? "—"}</Td>
              <Td className="text-gray-500 text-xs">{formatDateShort(c.createdAt)}</Td>
              <Td>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="text-xs py-1 px-2"
                    onClick={() => openEdit(c)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    className="text-xs py-1 px-2"
                    onClick={() => handleDelete(c.id)}
                  >
                    Hapus
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </Tbody>
      </Table>

      <Pagination
        page={page}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Pelanggan" : "Tambah Pelanggan"}
      >
        <div className="space-y-3">
          <Input
            label="Nama"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="No. HP"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Input
            label="Alamat"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <Button onClick={handleSave} loading={loading} className="w-full">
            Simpan
          </Button>
        </div>
      </Modal>
    </div>
  )
}
