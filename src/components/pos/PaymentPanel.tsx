"use client"

import { usePosStore } from "@/store/pos"
import { formatRupiah } from "@/lib/format"
import { Button } from "@/components/ui/Button"
import { useEffect } from "react"

type PaymentMethod = { id: number; name: string }
type Discount = { id: number; name: string; type: string; value: number; scope: string }

interface PaymentPanelProps {
  paymentMethods: PaymentMethod[]
  discounts: Discount[]
  onCheckout: () => void
  loading: boolean
}

const QUICK_AMOUNTS = [5_000, 10_000, 20_000, 50_000, 100_000]

export function PaymentPanel({ paymentMethods, discounts, onCheckout, loading }: PaymentPanelProps) {
  const store = usePosStore()
  const subtotal = store.getSubtotal()
  const total = store.getTotal()
  const change = store.getChange()

  useEffect(() => {
    if (paymentMethods.length > 0 && !store.paymentMethodId) {
      store.setPaymentMethod(paymentMethods[0].id)
    }
  }, [paymentMethods])

  function handleDiscountChange(id: string) {
    if (!id) { store.setDiscount(null, 0); return }
    const d = discounts.find((x) => x.id === Number(id))
    if (!d) return
    const amount = d.type === "PERCENT"
      ? Math.round((subtotal * d.value) / 100)
      : d.value
    store.setDiscount(d.id, amount)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <p className="text-xs text-orange-600 font-medium uppercase tracking-wide mb-1">Total Bayar</p>
        <p className="text-4xl font-bold text-orange-900 tabular-nums">{formatRupiah(total)}</p>
        {store.discountAmount > 0 && (
          <p className="text-xs text-green-600 mt-1">Hemat {formatRupiah(store.discountAmount)}</p>
        )}
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Diskon</label>
        <select
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => handleDiscountChange(e.target.value)}
        >
          <option value="">Tanpa diskon</option>
          {discounts.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Metode Bayar</label>
        <div className="grid grid-cols-2 gap-1.5">
          {paymentMethods.map((pm) => (
            <button
              key={pm.id}
              onClick={() => store.setPaymentMethod(pm.id)}
              className={`py-2 px-3 text-sm rounded-md border transition-colors ${
                store.paymentMethodId === pm.id
                  ? "bg-blue-600 text-white border-blue-600 font-semibold"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {pm.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Nominal Diterima</label>
        <input
          type="number"
          value={store.paymentAmount || ""}
          onChange={(e) => store.setPaymentAmount(Number(e.target.value))}
          placeholder="0"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-lg font-semibold text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="grid grid-cols-3 gap-1 mt-1.5">
          <button onClick={() => store.setPaymentAmount(total)} className="text-xs bg-green-50 border border-green-200 text-green-700 rounded py-1 hover:bg-green-100">Pas</button>
          {QUICK_AMOUNTS.slice(0, 4).map((amt) => (
            <button
              key={amt}
              onClick={() => store.setPaymentAmount(Math.ceil(total / amt) * amt)}
              className="text-xs bg-gray-50 border border-gray-200 text-gray-700 rounded py-1 hover:bg-gray-100"
            >
              {formatRupiah(amt)}
            </button>
          ))}
        </div>
      </div>

      {store.paymentAmount > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-md px-4 py-2 flex justify-between items-center">
          <span className="text-sm text-green-700">Kembali</span>
          <span className="text-xl font-bold text-green-800 tabular-nums">{formatRupiah(change)}</span>
        </div>
      )}

      <Button
        onClick={onCheckout}
        loading={loading}
        disabled={store.items.length === 0 || !store.paymentMethodId || store.paymentAmount < total}
        className="w-full py-4 text-base font-bold"
      >
        SELESAI &amp; CETAK STRUK
      </Button>
    </div>
  )
}
