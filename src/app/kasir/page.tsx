"use client"

import { useState, useCallback, useEffect } from "react"
import { useSession } from "next-auth/react"
import { usePosStore } from "@/store/pos"
import { BarcodeListener } from "@/components/pos/BarcodeListener"
import { ProductSearch } from "@/components/pos/ProductSearch"
import { CartPanel } from "@/components/pos/CartPanel"
import { PaymentPanel } from "@/components/pos/PaymentPanel"
import { VariantPickerModal } from "@/components/pos/VariantPickerModal"
import { ReceiptTemplate, type ReceiptData } from "@/components/receipt/ReceiptTemplate"
import { Toast } from "@/components/ui/Toast"
import { formatRupiah } from "@/lib/format"

type ToastState = { message: string; type: "success" | "error" | "info" } | null
type PaymentMethod = { id: number; name: string }
type Discount = { id: number; name: string; type: string; value: number; scope: string }
type VariantResult = { id: number; productId: number; productName: string; variantName: string; price: number; stock: number; unit: string; barcode: string | null }

export default function KasirPage() {
  const { data: session } = useSession()
  const store = usePosStore()

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [toast, setToast] = useState<ToastState>(null)
  const [loading, setLoading] = useState(false)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [pickerVariants, setPickerVariants] = useState<VariantResult[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch("/api/payment-methods").then((r) => r.json()),
      fetch("/api/discounts?active=true").then((r) => r.json()),
    ]).then(([pms, disc]) => {
      setPaymentMethods(pms.filter((p: any) => p.isActive !== false))
      setDiscounts(disc.discounts ?? [])
    })
  }, [])

  const handleScan = useCallback(async (barcode: string) => {
    const res = await fetch("/api/variants/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barcode }),
    })
    const data = await res.json()
    if (!res.ok) {
      setToast({ message: data.error ?? "Produk tidak ditemukan", type: "error" })
      return
    }
    store.addItem(data)
    setToast({ message: `${data.productName} ${data.variantName} ditambahkan`, type: "success" })
  }, [store])

  const handleSearchSelect = useCallback((item: VariantResult, allResults: VariantResult[]) => {
    const sameProduct = allResults.filter((v) => v.productId === item.productId)
    if (sameProduct.length > 1) {
      setPickerVariants(sameProduct)
      setPickerOpen(true)
    } else {
      store.addItem(item)
    }
  }, [store])

  async function handleCheckout() {
    if (!store.paymentMethodId) return
    setLoading(true)

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: store.items.map((i) => ({
          variantId: i.variantId,
          qty: i.qty,
          unitPrice: i.price,
          itemDiscountAmt: i.itemDiscountAmt,
        })),
        customerId: store.customerId,
        discountId: store.discountId,
        paymentMethodId: store.paymentMethodId,
        paymentAmount: store.paymentAmount,
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const err = await res.json()
      setToast({ message: err.error ?? "Transaksi gagal", type: "error" })
      return
    }

    const tx = await res.json()
    const config = await fetch("/api/receipt-config").then((r) => r.json())

    const receipt: ReceiptData = {
      transactionId: tx.id,
      createdAt: tx.createdAt,
      cashierName: session?.user?.name ?? "-",
      customerName: tx.customer?.name,
      items: tx.items.map((item: any) => ({
        productName: item.productVariant.product.name,
        variantName: item.productVariant.variantName,
        unit: item.productVariant.unit,
        qty: item.qty,
        unitPrice: Number(item.unitPrice),
        itemDiscountAmt: Number(item.itemDiscountAmt),
        subtotal: Number(item.subtotal),
      })),
      subtotal: Number(tx.subtotal),
      discountAmount: Number(tx.discountAmount),
      total: Number(tx.total),
      paymentAmount: Number(tx.paymentAmount),
      changeAmount: Number(tx.changeAmount),
      paymentMethod: tx.paymentMethod.name,
      config,
    }

    setReceiptData(receipt)
    store.reset()
    setTimeout(() => window.print(), 300)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
        <h1 className="font-bold text-gray-900">Kasir</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{session?.user?.name}</span>
          {store.items.length > 0 && (
            <button onClick={() => store.reset()} className="text-sm text-red-500 hover:text-red-700">
              Kosongkan
            </button>
          )}
        </div>
      </div>

      <BarcodeListener onScan={handleScan} />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-200 bg-white">
          <div className="p-3 border-b border-gray-100">
            <ProductSearch onSelect={handleSearchSelect} />
          </div>
          <div className="px-2 py-1 bg-gray-50 border-b border-gray-100 flex justify-between text-xs text-gray-500">
            <span>{store.items.length} item</span>
            <span>Subtotal: <strong>{formatRupiah(store.getSubtotal())}</strong></span>
          </div>
          <CartPanel />
        </div>

        <div className="w-80 shrink-0 overflow-y-auto bg-white p-4">
          <PaymentPanel
            paymentMethods={paymentMethods}
            discounts={discounts}
            onCheckout={handleCheckout}
            loading={loading}
          />
        </div>
      </div>

      {receiptData && (
        <div className="hidden print:block">
          <ReceiptTemplate data={receiptData} />
        </div>
      )}

      <VariantPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        variants={pickerVariants}
        onSelect={(v) => store.addItem(v)}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  )
}
