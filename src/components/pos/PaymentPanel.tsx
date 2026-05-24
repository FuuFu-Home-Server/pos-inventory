"use client"

import { usePosStore, type StoredDiscount } from "@/store/pos"
import { formatRupiah } from "@/lib/format"
import { Button } from "@/components/ui/Button"
import { Select } from "@/components/ui/Select"
import { ChevronLeft, QrCode } from "lucide-react"
import { useEffect, useState } from "react"

type PaymentMethod = { id: number; name: string }
type Discount = {
  id: number
  name: string
  type: string
  value: number
  scope: string
  minPurchase?: number | null
}
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

  function toggleDiscount(id: number) {
    const d = discounts.find((x) => x.id === id)
    if (!d) return
    const discount: StoredDiscount = {
      id: d.id,
      type: d.type,
      value: Number(d.value),
      scope: d.scope,
      minPurchase: d.minPurchase != null ? Number(d.minPurchase) : null,
    }
    const isAdding = !store.appliedDiscounts.some((a) => a.id === id)
    if (isAdding && d.scope === "TRANSACTION") {
      store.appliedDiscounts
        .filter((a) => a.scope === "TRANSACTION")
        .forEach((a) => store.toggleDiscount(a))
    }
    store.toggleDiscount(discount)
  }

  const canCheckout = isQris
    ? store.items.length > 0 && !!store.paymentMethodId
    : store.items.length > 0 && !!store.paymentMethodId && store.paymentAmount >= total

  const activeMethods = paymentMethods.filter(
    (pm) => !DISABLED_METHODS.includes(pm.name.toLowerCase()),
  )

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {onBack && (
          <div className="px-4 pt-4">
            <button
              onClick={onBack}
              className="md:hidden flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ChevronLeft size={16} />
              Keranjang
            </button>
          </div>
        )}

        {/* Total banner */}
        <div className="p-4 md:p-5 pb-0">
          <div className="bg-linear-to-br from-orange-500 to-orange-600 rounded-2xl px-5 py-4 text-white shadow-sm">
            <p className="text-xs font-medium opacity-70 mb-1 tracking-wide">TOTAL BAYAR</p>
            <p className="text-3xl font-black tabular-nums leading-tight">{formatRupiah(total)}</p>
            {store.getDiscountTotal() > 0 && (
              <p className="text-xs mt-1.5 bg-white/20 rounded-full px-2.5 py-0.5 inline-block font-medium">
                Hemat {formatRupiah(store.getDiscountTotal())}
              </p>
            )}
          </div>
        </div>

        <div className="px-4 md:px-5 pt-4 space-y-4 pb-4">
          {/* Customer + Discount */}
          {(customers.length > 0 || discounts.length > 0) && (
            <div className="space-y-2">
              <div className="flex gap-2">
                {customers.length > 0 && (
                  <Select
                    label="Pelanggan"
                    value={String(store.customerId ?? "")}
                    onChange={(v) => store.setCustomer(v ? Number(v) : null)}
                    options={[
                      { value: "", label: "Tanpa pelanggan" },
                      ...customers.map((c) => ({ value: String(c.id), label: c.name })),
                    ]}
                  />
                )}
                {discounts.length > 0 && (
                  <div className="w-full">
                    <Select
                      label="Diskon"
                      value=""
                      onChange={(v) => {
                        if (v) toggleDiscount(Number(v))
                      }}
                      options={discounts
                        .filter((d) => !store.appliedDiscounts.some((a) => a.id === d.id))
                        .map((d) => ({ value: String(d.id), label: d.name }))}
                      placeholder="+ Tambah diskon..."
                    />
                  </div>
                )}
              </div>
              {discounts.length > 0 && store.appliedDiscounts.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {store.appliedDiscounts.map((applied) => {
                    const d = discounts.find((x) => x.id === applied.id)
                    if (!d) return null
                    const amt = store.getDiscountAmounts()[applied.id] ?? 0
                    return (
                      <span
                        key={applied.id}
                        className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-800 text-xs font-semibold px-2.5 py-1.5 rounded-full border border-orange-200"
                      >
                        {d.name}
                        <span className="text-orange-500 tabular-nums">−{formatRupiah(amt)}</span>
                        <button
                          type="button"
                          onClick={() => toggleDiscount(applied.id)}
                          className="text-orange-400 hover:text-orange-700 leading-none"
                        >
                          ×
                        </button>
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Payment method */}
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
              Metode Bayar
            </p>
            <div className="flex gap-2 flex-wrap">
              {activeMethods.map((pm) => (
                <button
                  key={pm.id}
                  onClick={() => store.setPaymentMethod(pm.id)}
                  className={`flex-1 min-w-20 py-2.5 px-3 text-sm rounded-xl border-2 transition-all font-semibold ${
                    store.paymentMethodId === pm.id
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
                  }`}
                >
                  {pm.name}
                </button>
              ))}
            </div>
          </div>

          {/* Cash input or QRIS */}
          {isQris ? (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <QrCode size={18} className="text-indigo-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-indigo-700">Bayar dengan QRIS</p>
                <p className="text-xs text-indigo-400 mt-0.5">
                  QR akan muncul setelah klik Selesai
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Amount input */}
              <div className="px-4 pt-3 pb-2">
                <p className="text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                  Nominal Diterima
                </p>
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
                  className="w-full text-2xl font-black text-right text-gray-900 tabular-nums bg-transparent focus:outline-none placeholder:text-gray-300"
                  data-payment-input
                />
              </div>

              {/* Action row */}
              <div className="flex flex-wrap gap-1.5 px-3 pb-3">
                <button
                  onClick={() => store.setPaymentAmount(total)}
                  className="text-xs bg-green-50 border border-green-200 text-green-700 rounded-full px-3 py-1.5 hover:bg-green-100 font-semibold transition-colors"
                >
                  Pas
                </button>
                <button
                  onClick={() => store.setPaymentAmount(0)}
                  className="text-xs bg-red-50 border border-red-200 text-red-600 rounded-full px-3 py-1.5 hover:bg-red-100 font-semibold transition-colors"
                >
                  Reset
                </button>
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => store.setPaymentAmount((store.paymentAmount || 0) + amt)}
                    className="text-xs bg-gray-50 border border-gray-200 text-gray-600 rounded-full px-3 py-1.5 hover:bg-gray-100 transition-colors font-medium"
                  >
                    +{formatRupiah(amt)}
                  </button>
                ))}
              </div>

              {/* Kembalian */}
              {store.paymentAmount > 0 && (
                <div
                  className={`flex justify-between items-center px-4 py-3 border-t ${
                    change >= 0 ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"
                  }`}
                >
                  <span
                    className={`text-sm font-medium ${change >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {change >= 0 ? "Kembalian" : "Kurang"}
                  </span>
                  <span
                    className={`text-2xl font-black tabular-nums ${change >= 0 ? "text-green-700" : "text-red-700"}`}
                  >
                    {formatRupiah(Math.abs(change))}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pinned footer */}
      <div className="px-4 md:px-5 py-4 border-t border-gray-200 bg-gray-50 flex flex-col gap-3">
        {!isQris && (
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={skipPrint}
              onChange={(e) => onSkipPrintChange(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-500">Simpan tanpa cetak struk</span>
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
    </div>
  )
}
