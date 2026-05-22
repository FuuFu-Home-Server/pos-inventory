"use client"

import { Table, Thead, Tbody, Th, Td } from "@/components/ui/Table"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { Select } from "@/components/ui/Select"
import { formatRupiah } from "@/lib/format"
import { useDiscounts } from "./useDiscounts"

export default function DiskonPage() {
  const {
    discounts,
    products,
    modalOpen,
    setModalOpen,
    loading,
    form,
    setForm,
    handleCreate,
    handleToggle,
    handleDelete,
  } = useDiscounts()

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
        <h1 className="text-xl font-bold md:text-2xl text-gray-900">Diskon</h1>
        <Button onClick={() => setModalOpen(true)}>+ Tambah Diskon</Button>
      </div>
      <Table>
        <Thead>
          <tr>
            <Th>Nama</Th>
            <Th>Tipe</Th>
            <Th>Nilai</Th>
            <Th>Berlaku untuk</Th>
            <Th>Min. Belanja</Th>
            <Th>Status</Th>
            <Th />
          </tr>
        </Thead>
        <Tbody>
          {discounts.map((d) => (
            <tr key={d.id} className="hover:bg-gray-50">
              <Td className="font-medium">{d.name}</Td>
              <Td>
                <Badge>{d.type === "PERCENT" ? "Persen" : "Nominal"}</Badge>
              </Td>
              <Td>{d.type === "PERCENT" ? `${d.value}%` : formatRupiah(Number(d.value))}</Td>
              <Td className="text-gray-500 text-xs">
                {d.scope === "PRODUCT" && d.product ? d.product.name : "Semua transaksi"}
              </Td>
              <Td className="text-gray-500 text-xs">
                {d.minPurchase ? formatRupiah(Number(d.minPurchase)) : "—"}
              </Td>
              <Td>
                <Badge variant={d.isActive ? "success" : "default"}>
                  {d.isActive ? "Aktif" : "Nonaktif"}
                </Badge>
              </Td>
              <Td>
                <div className="flex gap-1">
                  <Button
                    variant="secondary"
                    className="text-xs py-1 px-2"
                    onClick={() => handleToggle(d.id, d.isActive)}
                  >
                    {d.isActive ? "Nonaktifkan" : "Aktifkan"}
                  </Button>
                  <Button
                    variant="danger"
                    className="text-xs py-1 px-2"
                    onClick={() => handleDelete(d.id)}
                  >
                    Hapus
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </Tbody>
      </Table>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Tambah Diskon">
        <div className="space-y-3">
          <Input
            label="Nama Diskon"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Tipe"
              value={form.type}
              onChange={(v) => setForm({ ...form, type: v })}
              options={[
                { value: "PERCENT", label: "Persen (%)" },
                { value: "FLAT", label: "Nominal (Rp)" },
              ]}
            />
            <Input
              label="Nilai"
              type="number"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              placeholder={form.type === "PERCENT" ? "10" : "5000"}
            />
          </div>
          <Select
            label="Berlaku untuk"
            value={form.scope}
            onChange={(v) => setForm({ ...form, scope: v, productId: "" })}
            options={[
              { value: "TRANSACTION", label: "Semua transaksi" },
              { value: "PRODUCT", label: "Produk tertentu" },
            ]}
          />
          {form.scope === "PRODUCT" && (
            <Select
              label="Produk"
              value={form.productId}
              onChange={(v) => setForm({ ...form, productId: v })}
              options={products.map((p) => ({ value: String(p.id), label: p.name }))}
              placeholder="Pilih produk..."
            />
          )}
          <Input
            label="Min. Belanja (opsional)"
            type="number"
            value={form.minPurchase}
            onChange={(e) => setForm({ ...form, minPurchase: e.target.value })}
            placeholder="0"
          />
          <Button onClick={handleCreate} loading={loading} className="w-full">
            Simpan Diskon
          </Button>
        </div>
      </Modal>
    </div>
  )
}
