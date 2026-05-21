"use client"

import { BarcodeListener } from "@/components/pos/BarcodeListener"
import { CartPanel } from "@/components/pos/CartPanel"
import { PaymentPanel } from "@/components/pos/PaymentPanel"
import { ProductSearch } from "@/components/pos/ProductSearch"
import { ReceiptTemplate, type ReceiptData } from "@/components/receipt/ReceiptTemplate"
import { Select } from "@/components/ui/Select"
import { Toast } from "@/components/ui/Toast"
import { usePosStore } from "@/store/pos"
import { LayoutDashboard } from "lucide-react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"

type ToastState = {
  message: string
  type: "success" | "error" | "info"
} | null
type PaymentMethod = { id: number; name: string }
type Discount = {
  id: number
  name: string
  type: string
  value: number
  scope: string
}
type VariantResult = {
  id: number
  productId: number
  productName: string
  variantName: string
  price: number
  stock: number
  unit: string
  barcode: string | null
}
type Customer = { id: number; name: string; phone: string | null }

function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="text-slate-400 text-xs tabular-nums">
      <span>
        {now.toLocaleDateString("id-ID", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </span>
      <span className="mx-1.5 text-slate-600">·</span>
      <span className="font-mono text-slate-300">
        {now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </span>
    </div>
  )
}

export default function KasirPage() {
  const { data: session } = useSession()
  const store = usePosStore()

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [toast, setToast] = useState<ToastState>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [skipPrint, setSkipPrint] = useState(false)

  const checkoutRef = useRef<() => void>(() => {})
  const umumIdRef = useRef<number | null>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/payment-methods").then((r) => r.json()),
      fetch("/api/discounts?active=true").then((r) => r.json()),
      fetch("/api/customers").then((r) => r.json()),
    ]).then(async ([pms, disc, cust]) => {
      setPaymentMethods(pms.filter((p: any) => p.isActive !== false))
      setDiscounts(disc.discounts ?? [])

      let customerList: Customer[] = cust.customers ?? []
      let umum = customerList.find((c) => c.name === "UMUM")
      if (!umum) {
        const res = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "UMUM" }),
        })
        if (res.ok) {
          umum = await res.json()
          customerList = [umum!, ...customerList]
        }
      }
      setCustomers(customerList)
      if (umum) {
        umumIdRef.current = umum.id
        if (!store.customerId) store.setCustomer(umum.id)
      }
      setInitialLoading(false)
    })
  }, [])

  function toCartItem(v: VariantResult) {
    return {
      variantId: v.id,
      productId: v.productId,
      productName: v.productName,
      variantName: v.variantName,
      price: v.price,
      stock: v.stock,
      unit: v.unit,
    }
  }

  const handleScan = useCallback(
    async (barcode: string) => {
      const res = await fetch("/api/variants/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode }),
      })
      const data = await res.json()
      if (!res.ok) {
        setToast({
          message: data.error ?? "Produk tidak ditemukan",
          type: "error",
        })
        return
      }
      store.addItem(toCartItem(data))
      setToast({
        message: `${data.productName} ${data.variantName} ditambahkan`,
        type: "success",
      })
    },
    [store],
  )

  const handleSearchSelect = useCallback(
    (item: VariantResult) => {
      store.addItem(toCartItem(item))
      setToast({
        message: `${item.productName} ${item.variantName} ditambahkan`,
        type: "success",
      })
    },
    [store],
  )

  async function handleCheckout() {
    if (!store.paymentMethodId || store.items.length === 0) return
    const total = store.getTotal()
    if (store.paymentAmount < total) return

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

    if (!skipPrint) {
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
      setTimeout(() => window.print(), 300)
    }

    store.reset()
    if (umumIdRef.current) store.setCustomer(umumIdRef.current)
    setToast({ message: "Transaksi berhasil disimpan", type: "success" })
    document.querySelector<HTMLInputElement>("[data-search-input]")?.focus()
  }

  checkoutRef.current = handleCheckout

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isEditable = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)

      if (e.key === "/" && !isEditable) {
        e.preventDefault()
        document.querySelector<HTMLInputElement>("[data-search-input]")?.focus()
        return
      }
      if (e.key === "F2") {
        e.preventDefault()
        document.querySelector<HTMLInputElement>("[data-payment-input]")?.focus()
        return
      }
      if (e.key === "F8") {
        e.preventDefault()
        if (!loading) checkoutRef.current()
        return
      }
      if (e.key === "Escape" && isEditable) {
        target.blur()
        document.querySelector<HTMLInputElement>("[data-search-input]")?.focus()
        return
      }
      if (e.key === "Delete" && !isEditable && e.ctrlKey) {
        e.preventDefault()
        store.reset()
        if (umumIdRef.current) store.setCustomer(umumIdRef.current)
        return
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [loading, store])

  if (initialLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Memuat kasir...</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      <header className="bg-slate-900 border-b border-slate-800 px-5 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-xs"
          >
            <LayoutDashboard size={14} />
            Dashboard
          </Link>
          <div className="w-px h-4 bg-slate-700" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-white text-sm">Kasir</span>
          </div>
          <Clock />
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3 text-xs text-slate-500">
            <kbd className="bg-slate-800 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded font-mono">
              /
            </kbd>
            <span>Cari</span>
            <kbd className="bg-slate-800 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded font-mono">
              F2
            </kbd>
            <span>Bayar</span>
            <kbd className="bg-slate-800 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded font-mono">
              F8
            </kbd>
            <span>Selesai</span>
            <kbd className="bg-slate-800 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded font-mono">
              Esc
            </kbd>
            <span>Kembali</span>
          </div>
          <span className="text-sm text-slate-400">{session?.user?.name}</span>
          {store.items.length > 0 && (
            <button
              onClick={() => {
                store.reset()
                if (umumIdRef.current) store.setCustomer(umumIdRef.current)
              }}
              className="text-xs text-red-400 hover:text-red-300 border border-red-800 rounded-lg px-3 py-1.5 hover:bg-red-950/40 transition-colors"
            >
              Kosongkan
            </button>
          )}
        </div>
      </header>

      <BarcodeListener onScan={handleScan} />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden bg-white border-r border-gray-200">
          <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <div className="flex-1">
              <ProductSearch onSelect={handleSearchSelect} />
            </div>
            <div className="shrink-0">
              <Select
                value={store.customerId ? String(store.customerId) : ""}
                onChange={(v) => store.setCustomer(v ? Number(v) : null)}
                options={customers.map((c) => ({
                  value: String(c.id),
                  label: c.name,
                }))}
                placeholder="Tanpa pelanggan"
                className="min-w-[160px]"
              />
            </div>
          </div>
          <CartPanel />
        </div>

        <div className="w-[368px] shrink-0 overflow-y-auto bg-gray-50 p-5">
          <PaymentPanel
            paymentMethods={paymentMethods}
            discounts={discounts}
            onCheckout={handleCheckout}
            loading={loading}
            skipPrint={skipPrint}
            onSkipPrintChange={setSkipPrint}
          />
        </div>
      </div>

      {receiptData && (
        <div className="hidden print:block">
          <ReceiptTemplate data={receiptData} />
        </div>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  )
}
