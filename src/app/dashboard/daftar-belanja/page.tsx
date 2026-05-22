"use client"

import { formatRupiah, formatDate } from "@/lib/format"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Toggle } from "@/components/ui/Toggle"
import { PurchaseModal } from "@/components/ui/PurchaseModal"
import { ChevronDown, AlertTriangle, Plus, ShoppingCart } from "lucide-react"
import { usePurchaseList } from "./usePurchaseList"

export default function DaftarBelanjaPage() {
  const {
    lists,
    expandedId,
    details,
    loadingId,
    modalOpen,
    setModalOpen,
    lowStock,
    loading,
    form,
    setForm,
    searchVariants,
    handleAddVariant,
    addLowStockToForm,
    toggleDetail,
    handleCreate,
    toggleItemPurchased,
    handleDelete,
    markDone,
    completeToPO,
    createProductForList,
  } = usePurchaseList()

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-wrap justify-between items-start gap-3 mb-5">
        <div>
          <h1 className="text-xl font-black md:text-2xl text-gray-900">Daftar Belanja</h1>
          <p className="text-sm text-gray-500 mt-0.5">Belanja mandiri dari berbagai tempat</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={14} className="mr-1" />
          Buat Daftar
        </Button>
      </div>

      {lowStock.length > 0 && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-amber-600" />
            <span className="text-sm font-bold text-amber-800">
              {lowStock.length} produk stok menipis
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.slice(0, 8).map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  setModalOpen(true)
                  setTimeout(() => addLowStockToForm(v), 50)
                }}
                className="text-xs bg-white border border-amber-300 text-amber-800 rounded-lg px-2.5 py-1.5 hover:bg-amber-100 transition-colors font-medium"
              >
                {v.product.name} {v.variantName}{" "}
                <span className="text-amber-500">(stok: {v.stock})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {lists.length === 0 && (
          <div className="text-center py-12 text-gray-400 bg-white border border-gray-200 rounded-xl">
            <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Belum ada daftar belanja</p>
          </div>
        )}
        {lists.map((list) => {
          const isExpanded = expandedId === list.id
          const detail = details[list.id]
          const isLoading = loadingId === list.id

          return (
            <div
              key={list.id}
              className={`bg-white border rounded-xl overflow-hidden transition-all ${isExpanded ? "border-indigo-200 shadow-md" : "border-gray-200"}`}
            >
              <div
                className={`flex items-center justify-between px-5 py-4 cursor-pointer select-none ${isExpanded ? "bg-indigo-50" : "hover:bg-gray-50"}`}
                onClick={() => toggleDetail(list.id)}
              >
                <div className="flex items-center gap-3">
                  <ChevronDown
                    size={15}
                    className={`text-gray-400 transition-transform duration-150 ${isExpanded ? "rotate-180" : ""}`}
                  />
                  <div>
                    <p className="font-bold text-gray-900">{list.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(list.createdAt)} · {list._count.items} item ·{" "}
                      {formatRupiah(list.totalCost)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    {list.purchasedCount}/{list._count.items} dibeli
                  </span>
                  <Badge variant={list.status === "DONE" ? "success" : "warning"}>
                    {list.status === "DONE" ? "Selesai" : "Terbuka"}
                  </Badge>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    {list.status === "OPEN" && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={async () => {
                          await completeToPO(list.id)
                        }}
                      >
                        Selesai & Buat PO
                      </Button>
                    )}
                    <Button variant="danger" size="sm" onClick={() => handleDelete(list.id)}>
                      Hapus
                    </Button>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-indigo-100 px-5 py-4 bg-indigo-50/40">
                  {isLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                      <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      Memuat...
                    </div>
                  ) : detail ? (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-400 border-b border-indigo-100">
                          <th className="text-left font-semibold pb-2 w-8"></th>
                          <th className="text-left font-semibold pb-2">Produk</th>
                          <th className="text-center font-semibold pb-2">Jumlah</th>
                          <th className="text-right font-semibold pb-2">Harga / Satuan</th>
                          <th className="text-right font-semibold pb-2">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-indigo-100/60">
                        {detail.items.map((item) => (
                          <tr key={item.id} className={item.isPurchased ? "opacity-50" : ""}>
                            <td className="py-2">
                              <Toggle
                                checked={item.isPurchased}
                                onChange={(v) => toggleItemPurchased(list.id, item.id, v)}
                                size="sm"
                              />
                            </td>
                            <td
                              className={`py-2 font-medium ${item.isPurchased ? "line-through text-gray-400" : "text-gray-800"}`}
                            >
                              {item.productName}{" "}
                              <span className="text-gray-500">{item.variantName}</span>
                            </td>
                            <td className="py-2 text-center text-gray-600">
                              {item.qty} {item.unit}
                              {item.qtyPerUnit > 1 && (
                                <span className="block text-[10px] text-indigo-500">
                                  = {item.qty * item.qtyPerUnit} pcs
                                </span>
                              )}
                            </td>
                            <td className="py-2 text-right text-gray-600 tabular-nums">
                              {formatRupiah(Number(item.unitCost))}
                            </td>
                            <td className="py-2 text-right font-semibold tabular-nums">
                              {formatRupiah(Number(item.unitCost) * item.qty)}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t border-indigo-200">
                          <td colSpan={4} className="pt-2 font-black text-gray-900 text-right pr-3">
                            Total
                          </td>
                          <td className="pt-2 text-right font-black text-gray-900 tabular-nums">
                            {formatRupiah(
                              detail.items
                                .filter((i) => i.isPurchased)
                                .reduce((s, i) => s + Number(i.unitCost) * i.qty, 0),
                            )}
                            <span className="text-gray-400 font-normal">
                              {" "}
                              /{" "}
                              {formatRupiah(
                                detail.items.reduce((s, i) => s + Number(i.unitCost) * i.qty, 0),
                              )}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  ) : null}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <PurchaseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Buat Daftar Belanja"
        showQtyPerUnit
        headerSlot={
          <>
            <Input
              label="Nama Daftar"
              placeholder="mis. Belanja Superindo 21 Mei"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <Input
              label="Catatan"
              placeholder="Opsional..."
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
        submitLabel="Buat Daftar Belanja"
        submitDisabled={!form.title || form.items.length === 0}
        onCreateProduct={createProductForList}
      />
    </div>
  )
}
