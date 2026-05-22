"use client"

import { usePosStore } from "@/store/pos"
import { formatRupiah } from "@/lib/format"
import { Button } from "@/components/ui/Button"
import { ChevronLeft, QrCode } from "lucide-react"
import { useEffect, useState } from "react"

type PaymentMethod = { id: number; name: string }
type Discount = { id: number; name: string; type: string; value: number; scope: string }
type Customer = { id: number; name: string; phone: string | null }

interface PaymentPanelProps {
  paymentMethods: PaymentMethod[]
  discounts: Discount[]
  customers: Customer[]
  onCheckout: () => void
  loading: boolean
  skipPrint: boolean
  onSkipPrintChange: (v: boolean) => void
  onBack?: () => void
  isQris?: boolean
}

const QUICK_AMOUNTS = [5_000, 10_000, 20_000, 50_000, 100_000]
const DISABLED_METHODS = ["transfer", "debit", "kredit", "credit"]

export function PaymentPanel({
  paymentMethods,
  discounts,
  customers,
  onCheckout,
  loading,
  skipPrint,
  onSkipPrintChange,
  onBack,
  isQris = false,
}: PaymentPanelProps) {
  const store = usePosStore()
  const subtotal = store.getSubtotal()
  const total = store.getTotal()
  const change = store.getChange()
  const [paymentDisplay, setPaymentDisplay] = useState("")

  useEffect(() => {
    setPaymentDisplay(store.paymentAmount ? store.paymentAmount.toLocaleString("id-ID") : "")
  }, [store.paymentAmount])

  useEffect(() => {
    if (paymentMethods.length > 0 && !store.paymentMethodId) {
      const tunai = paymentMethods.find((pm) => pm.name.toLowerCase().includes("tunai"))
      store.setPaymentMethod((tunai ?? paymentMethods[0]).id)
    }
  }, [paymentMethods])

  useEffect(() => {
    if (isQris) store.setPaymentAmount(total)
  }, [isQris, total])

  function handleDiscountChange(id: string) {
    if (!id) {
      store.setDiscount(null, 0)
      return
    }
    const d = discounts.find((x) => x.id === Number(id))
    if (!d) return
    const amount = d.type === "PERCENT" ? Math.round((subtotal * d.value) / 100) : d.value
    store.setDiscount(d.id, amount)
  }

  const canCheckout = isQris
    ? store.items.length > 0 && !!store.paymentMethodId
    : store.items.length > 0 && !!store.paymentMethodId && store.paymentAmount >= total

  return (
    <div className="flex flex-col gap-4">
      {onBack && (
        <button
          onClick={onBack}
          className="md:hidden flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors -mb-1"
        >
          <ChevronLeft size={16} />
          Keranjang
        </button>
      )}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white shadow-sm">
        <p className="text-xs font-medium uppercase tracking-widest opacity-80 mb-1">Total Bayar</p>
        <p className="text-4xl font-black tabular-nums leading-none">{formatRupiah(total)}</p>
        {store.discountAmount > 0 && (
          <p className="text-xs mt-2 bg-white/20 rounded px-2 py-0.5 inline-block">
            Hemat {formatRupiah(store.discountAmount)}
          </p>
        )}
      </div>

      {customers.length > 0 && (
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
            Pelanggan
          </label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            value={store.customerId ?? ""}
            onChange={(e) => store.setCustomer(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Tanpa pelanggan</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {discounts.length > 0 && (
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
            Diskon
          </label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            onChange={(e) => handleDiscountChange(e.target.value)}
          >
            <option value="">Tanpa diskon</option>
            {discounts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
          Metode Bayar
        </label>
        <div className="grid grid-cols-2 gap-2">
          {paymentMethods.map((pm) => {
            const disabled = DISABLED_METHODS.includes(pm.name.toLowerCase())
            return (
              <button
                key={pm.id}
                disabled={disabled}
                onClick={() => !disabled && store.setPaymentMethod(pm.id)}
                className={`py-2.5 px-3 text-sm rounded-lg border-2 transition-all font-medium ${
                  disabled
                    ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                    : store.paymentMethodId === pm.id
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50"
                }`}
              >
                {pm.name}
              </button>
            )
          })}
        </div>
      </div>

      {isQris ? (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <QrCode size={18} className="text-indigo-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-indigo-700">Bayar dengan QRIS</p>
            <p className="text-xs text-indigo-400 mt-0.5">QR akan muncul setelah klik Selesai</p>
          </div>
        </div>
      ) : (
        <>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
              Nominal Diterima
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={paymentDisplay}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "")
                const num = raw ? Number(raw) : 0
                setPaymentDisplay(num ? num.toLocaleString("id-ID") : "")
                store.setPaymentAmount(num)
              }}
              onFocus={(e) => e.target.select()}
              placeholder={total.toLocaleString("id-ID")}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-xl font-bold text-right focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 tabular-nums"
              data-payment-input
            />
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              <button
                onClick={() => store.setPaymentAmount(total)}
                className="text-xs bg-green-50 border border-green-200 text-green-700 rounded-lg py-1.5 hover:bg-green-100 font-semibold transition-colors"
              >
                Pas
              </button>
              <button
                onClick={() => store.setPaymentAmount(0)}
                className="text-xs bg-red-50 border border-red-200 text-red-600 rounded-lg py-1.5 hover:bg-red-100 font-semibold transition-colors"
              >
                Reset
              </button>
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => store.setPaymentAmount((store.paymentAmount || 0) + amt)}
                  className="text-xs bg-gray-50 border border-gray-200 text-gray-700 rounded-lg py-1.5 hover:bg-gray-100 transition-colors"
                >
                  +{formatRupiah(amt)}
                </button>
              ))}
            </div>
          </div>

          {store.paymentAmount > 0 && (
            <div
              className={`rounded-xl px-4 py-3 flex justify-between items-center ${change >= 0 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
            >
              <span
                className={`text-sm font-medium ${change >= 0 ? "text-green-700" : "text-red-700"}`}
              >
                {change >= 0 ? "Kembalian" : "Kurang"}
              </span>
              <span
                className={`text-2xl font-black tabular-nums ${change >= 0 ? "text-green-800" : "text-red-800"}`}
              >
                {formatRupiah(Math.abs(change))}
              </span>
            </div>
          )}
        </>
      )}

      {!isQris && (
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={skipPrint}
            onChange={(e) => onSkipPrintChange(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">Simpan tanpa cetak struk</span>
        </label>
      )}

      <Button
        onClick={onCheckout}
        loading={loading}
        disabled={!canCheckout}
        className="w-full py-4 text-base font-black rounded-xl tracking-wide"
      >
        {isQris
          ? "📱  TAMPILKAN QRIS"
          : skipPrint
            ? "✓  SELESAI TRANSAKSI"
            : "🖨  SELESAI & CETAK STRUK"}
      </Button>
    </div>
  )
}
