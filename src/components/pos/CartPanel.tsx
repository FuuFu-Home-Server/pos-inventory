"use client"

import { useState, useEffect, useRef } from "react"
import { usePosStore, type CartItem } from "@/store/pos"
import { formatRupiah } from "@/lib/format"
import { ArrowLeftRight } from "lucide-react"

type VariantOption = {
  id: number
  variantName: string
  price: number
  stock: number
  unit: string
}

export function CartPanel() {
  const { items, removeItem, updateQty } = usePosStore()

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
        <svg className="w-16 h-16 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
        </svg>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-500">Keranjang kosong</p>
          <p className="text-xs text-gray-400 mt-0.5">Scan barcode atau cari produk di atas</p>
        </div>
      </div>
    )
  }

  const itemCount = items.reduce((s, i) => s + i.qty, 0)

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-2.5 bg-gray-100 border-b border-gray-200 flex items-center justify-between sticky top-0 z-10">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Keranjang</span>
        <span className="text-xs text-gray-400">{items.length} jenis · {itemCount} item</span>
      </div>
      <table className="w-full">
        <tbody className="divide-y divide-gray-100">
          {items.map((item, idx) => (
            <CartRow key={item.variantId} item={item} idx={idx} onUpdateQty={updateQty} onRemove={removeItem} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CartRow({ item, idx, onUpdateQty, onRemove }: {
  item: CartItem
  idx: number
  onUpdateQty: (id: number, qty: number) => void
  onRemove: (id: number) => void
}) {
  const { changeVariant } = usePosStore()
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [variants, setVariants] = useState<VariantOption[]>([])
  const [loadingVariants, setLoadingVariants] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  async function openSwitcher() {
    if (switcherOpen) { setSwitcherOpen(false); return }
    setLoadingVariants(true)
    setSwitcherOpen(true)
    const res = await fetch(`/api/products/${item.productId}/variants?activeOnly=true`)
    const data: VariantOption[] = await res.json()
    setVariants(data.filter((v) => v.id !== item.variantId))
    setLoadingVariants(false)
  }

  function handlePick(v: VariantOption) {
    changeVariant(item.variantId, {
      variantId: v.id,
      productId: item.productId,
      productName: item.productName,
      variantName: v.variantName,
      price: Number(v.price),
      unit: v.unit,
    })
    setSwitcherOpen(false)
  }

  useEffect(() => {
    if (!switcherOpen) return
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [switcherOpen])

  return (
    <>
      <tr className="hover:bg-indigo-50/40 group transition-colors">
        <td className="pl-4 pr-2 py-4 w-6 align-middle">
          <span className="text-sm font-bold text-gray-400 tabular-nums">{idx + 1}</span>
        </td>
        <td className="px-2 py-4">
          <p className="text-base font-bold text-gray-900 leading-tight">{item.productName}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-sm text-gray-500">{item.variantName}</span>
            <span className="text-gray-300">·</span>
            <span className="text-sm text-gray-500 tabular-nums">{formatRupiah(item.price)}<span className="text-gray-400">/{item.unit}</span></span>
            {item.productId && (
              <button
                onClick={openSwitcher}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold border border-indigo-200 hover:border-indigo-400 bg-indigo-50 hover:bg-indigo-100 rounded px-1.5 py-0.5 transition-colors"
                title="Ganti varian"
              >
                <ArrowLeftRight size={10} />
                Ganti
              </button>
            )}
          </div>
        </td>
        <td className="px-2 py-4">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onUpdateQty(item.variantId, item.qty - 1)}
              className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 flex items-center justify-center text-base font-bold border border-gray-200 transition-colors"
            >−</button>
            <input
              type="number"
              value={item.qty}
              min={1}
              onChange={(e) => onUpdateQty(item.variantId, Number(e.target.value))}
              className="w-12 text-center bg-white border border-gray-300 rounded-lg text-sm font-bold py-1.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => onUpdateQty(item.variantId, item.qty + 1)}
              className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700 flex items-center justify-center text-base font-bold border border-gray-200 transition-colors"
            >+</button>
          </div>
        </td>
        <td className="px-3 py-4 text-right">
          <span className="text-base font-black text-gray-900 tabular-nums">{formatRupiah(item.subtotal)}</span>
        </td>
        <td className="pr-3 py-4">
          <button
            onClick={() => onRemove(item.variantId)}
            className="text-gray-300 hover:text-red-500 text-xl leading-none opacity-0 group-hover:opacity-100 transition-all"
            title="Hapus"
          >×</button>
        </td>
      </tr>

      {switcherOpen && (
        <tr>
          <td colSpan={5} className="px-4 pb-3 pt-0">
            <div ref={wrapperRef} className="border border-indigo-200 rounded-xl bg-white shadow-lg overflow-hidden">
              <div className="px-3 py-2 bg-indigo-50 border-b border-indigo-100 text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
                <ArrowLeftRight size={11} />
                Pilih varian lain
              </div>
              {loadingVariants ? (
                <div className="px-4 py-3 text-xs text-gray-500 flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  Memuat varian...
                </div>
              ) : variants.length === 0 ? (
                <div className="px-4 py-3 text-xs text-gray-500">Tidak ada varian lain yang tersedia</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => handlePick(v)}
                      className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 flex items-center justify-between transition-colors"
                    >
                      <div>
                        <span className="text-sm font-semibold text-gray-900">{v.variantName}</span>
                        <span className="text-xs text-gray-400 ml-2">Stok: {v.stock} {v.unit}</span>
                      </div>
                      <span className="text-sm font-bold text-indigo-600 tabular-nums">{formatRupiah(Number(v.price))}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
