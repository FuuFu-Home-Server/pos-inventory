"use client"

import { usePosStore, type CartItem } from "@/store/pos"
import { formatRupiah } from "@/lib/format"

export function CartPanel() {
  const { items, removeItem, updateQty } = usePosStore()

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Scan atau cari produk untuk memulai
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 sticky top-0">
          <tr className="text-left text-xs text-gray-500 uppercase">
            <th className="px-3 py-2 font-medium">Produk</th>
            <th className="px-3 py-2 font-medium text-center w-24">Qty</th>
            <th className="px-3 py-2 font-medium text-right w-28">Subtotal</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => (
            <CartRow key={item.variantId} item={item} onUpdateQty={updateQty} onRemove={removeItem} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CartRow({ item, onUpdateQty, onRemove }: {
  item: CartItem
  onUpdateQty: (id: number, qty: number) => void
  onRemove: (id: number) => void
}) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-3 py-2">
        <p className="font-medium text-gray-900">{item.productName}</p>
        <p className="text-xs text-gray-500">{item.variantName} · {item.unit}</p>
        <p className="text-xs text-gray-400">{formatRupiah(item.price)} / {item.unit}</p>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => onUpdateQty(item.variantId, item.qty - 1)}
            className="w-6 h-6 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center justify-center text-xs font-bold"
          >−</button>
          <input
            type="number"
            value={item.qty}
            min={1}
            onChange={(e) => onUpdateQty(item.variantId, Number(e.target.value))}
            className="w-10 text-center border border-gray-300 rounded text-sm py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={() => onUpdateQty(item.variantId, item.qty + 1)}
            className="w-6 h-6 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center justify-center text-xs font-bold"
          >+</button>
        </div>
      </td>
      <td className="px-3 py-2 text-right font-semibold text-gray-900">
        {formatRupiah(item.subtotal)}
      </td>
      <td className="pr-2">
        <button
          onClick={() => onRemove(item.variantId)}
          className="text-gray-300 hover:text-red-500 text-lg leading-none"
        >×</button>
      </td>
    </tr>
  )
}
