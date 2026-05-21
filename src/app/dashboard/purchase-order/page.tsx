"use client"

import { Table, Thead, Tbody, Th, Td } from "@/components/ui/Table"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { formatDateShort, formatRupiah } from "@/lib/format"
import { ChevronDown } from "lucide-react"
import { Pagination } from "@/components/ui/Pagination"
import { PurchaseModal } from "@/components/ui/PurchaseModal"
import { usePurchaseOrder } from "./usePurchaseOrder"

const statusVariant = (s: string): "success" | "danger" | "warning" =>
  s === "RECEIVED" ? "success" : s === "CANCELLED" ? "danger" : "warning"

const statusLabel: Record<string, string> = {
  DRAFT: "Draf",
  RECEIVED: "Diterima",
  CANCELLED: "Dibatalkan",
}

export default function PurchaseOrderPage() {
  const {
    orders,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    expandedId,
    details,
    loadingId,
    modalOpen,
    setModalOpen,
    suppliers,
    form,
    setForm,
    loading,
    searchVariants,
    handleAddVariant,
    toggleDetail,
    handleCreate,
    handleStatus,
  } = usePurchaseOrder()

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Purchase Order</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} PO</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ Buat PO</Button>
      </div>

      <Table>
        <Thead>
          <tr>
            <Th>#</Th>
            <Th>Supplier</Th>
            <Th>Dibuat oleh</Th>
            <Th>Status</Th>
            <Th>Tgl Terima</Th>
            <Th>Item</Th>
            <Th />
          </tr>
        </Thead>
        <Tbody>
          {orders.map((o) => {
            const isExpanded = expandedId === o.id
            const detail = details[o.id]
            const isLoading = loadingId === o.id

            return (
              <>
                <tr
                  key={o.id}
                  className={`cursor-pointer select-none transition-colors ${isExpanded ? "bg-indigo-50" : "hover:bg-gray-50"}`}
                  onClick={() => toggleDetail(o.id)}
                >
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <ChevronDown
                        size={13}
                        className={`text-gray-400 transition-transform duration-150 shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                      />
                      <span className="text-gray-400 font-mono text-xs">#{o.id}</span>
                    </div>
                  </Td>
                  <Td className="font-medium">{o.supplier.name}</Td>
                  <Td className="text-gray-500 text-xs">{o.user.name}</Td>
                  <Td>
                    <Badge variant={statusVariant(o.status)}>
                      {statusLabel[o.status] ?? o.status}
                    </Badge>
                  </Td>
                  <Td className="text-gray-500 text-xs">
                    {o.receivedAt ? formatDateShort(o.receivedAt) : "—"}
                  </Td>
                  <Td className="text-gray-500">{o._count.items} item</Td>
                  <Td onClick={(e) => e.stopPropagation()}>
                    {o.status === "DRAFT" && (
                      <div className="flex gap-1">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleStatus(o.id, "RECEIVED")}
                        >
                          Terima
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleStatus(o.id, "CANCELLED")}
                        >
                          Batal
                        </Button>
                      </div>
                    )}
                  </Td>
                </tr>

                {isExpanded && (
                  <tr key={`${o.id}-detail`}>
                    <td colSpan={7} className="px-0 py-0 border-b border-indigo-100">
                      <div className="bg-indigo-50/60 border-t border-indigo-100 px-6 py-4">
                        {isLoading ? (
                          <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                            Memuat detail...
                          </div>
                        ) : detail ? (
                          <div className="grid grid-cols-[1fr_200px] gap-8 w-full">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-400 border-b border-indigo-100">
                                  <th className="text-left font-semibold pb-1.5">Produk</th>
                                  <th className="text-center font-semibold pb-1.5">Qty</th>
                                  <th className="text-right font-semibold pb-1.5">Harga Beli</th>
                                  <th className="text-right font-semibold pb-1.5">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-indigo-100/60">
                                {detail.items.map((item) => (
                                  <tr key={item.id}>
                                    <td className="py-1.5 text-gray-800 font-medium">
                                      {item.productVariant.product.name}
                                      <span className="text-gray-500 ml-1">
                                        {item.productVariant.variantName}
                                      </span>
                                    </td>
                                    <td className="py-1.5 text-center text-gray-600">
                                      {item.qty} {item.productVariant.unit}
                                    </td>
                                    <td className="py-1.5 text-right text-gray-600 tabular-nums">
                                      {formatRupiah(Number(item.unitCost))}
                                    </td>
                                    <td className="py-1.5 text-right font-semibold tabular-nums">
                                      {formatRupiah(Number(item.subtotal))}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div className="text-xs space-y-1 text-right">
                              <div className="flex justify-between gap-6 font-black text-sm text-gray-900 border-t border-indigo-200 pt-1">
                                <span>Total</span>
                                <span className="tabular-nums">
                                  {formatRupiah(
                                    detail.items.reduce((s, i) => s + Number(i.subtotal), 0),
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between gap-6 text-gray-500">
                                <span>Supplier</span>
                                <span>{detail.supplier.name}</span>
                              </div>
                              <div className="flex justify-between gap-6 text-gray-500">
                                <span>Dibuat</span>
                                <span>{formatDateShort(detail.createdAt)}</span>
                              </div>
                              {detail.receivedAt && (
                                <div className="flex justify-between gap-6 text-emerald-600">
                                  <span>Diterima</span>
                                  <span>{formatDateShort(detail.receivedAt)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            )
          })}
        </Tbody>
      </Table>

      <Pagination
        page={page}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <PurchaseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Buat Purchase Order"
        headerSlot={
          <>
            <Select
              label="Supplier"
              value={form.supplierId}
              onChange={(v) => setForm({ ...form, supplierId: v })}
              options={suppliers.map((s) => ({ value: String(s.id), label: s.name }))}
              placeholder="Pilih supplier..."
            />
            <Input
              label="Catatan"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </>
        }
        items={form.items}
        onItemsChange={(items) => setForm((f) => ({ ...f, items }))}
        searchVariants={searchVariants}
        onAddVariant={handleAddVariant}
        onSubmit={handleCreate}
        loading={loading}
        submitLabel="Buat PO"
        submitDisabled={!form.supplierId || form.items.length === 0}
      />
    </div>
  )
}
