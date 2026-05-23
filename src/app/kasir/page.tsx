"use client"

import { BarcodeListener } from "@/components/pos/BarcodeListener"
import { CartPanel } from "@/components/pos/CartPanel"
import { PaymentPanel } from "@/components/pos/PaymentPanel"
import { ProductSearch } from "@/components/pos/ProductSearch"
import { QrisModal } from "@/components/pos/QrisModal"
import { ReceiptTemplate, type ReceiptData } from "@/components/receipt/ReceiptTemplate"
import { Toast } from "@/components/ui/Toast"
import { cn } from "@/lib/utils"
import { usePosStore } from "@/store/pos"
import { useOnlineStatus } from "@/hooks/useOnlineStatus"
import { useSyncStatus } from "@/hooks/useSyncStatus"
import { printEscPos } from "@/lib/receipt-printer"
import {
  LayoutDashboard,
  Printer,
  Unplug,
  ShoppingCart as CartIcon,
  CreditCard,
  Package,
  ShoppingBag,
  BarChart2,
  Users,
  ClipboardList,
  Settings,
  Receipt,
  X,
} from "lucide-react"
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
  const [timezone, setTimezone] = useState<string | undefined>(undefined)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || !window.electronAPI) return
    window.electronAPI.getTimezone().then(setTimezone)
    const handler = (e: Event) => setTimezone((e as CustomEvent<string>).detail)
    window.addEventListener("timezone-changed", handler)
    return () => window.removeEventListener("timezone-changed", handler)
  }, [])

  const tzOpt = timezone ? { timeZone: timezone } : {}

  return (
    <div className="text-slate-400 text-xs tabular-nums flex items-baseline gap-1.5 leading-none">
      <span className="hidden sm:inline">
        {now.toLocaleDateString("id-ID", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
          ...tzOpt,
        })}
      </span>
      <span className="hidden sm:inline text-slate-600">·</span>
      <span className="font-mono text-slate-300 text-sm">
        {now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          ...tzOpt,
        })}
      </span>
    </div>
  )
}

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { href: "/dashboard", label: "Beranda", icon: LayoutDashboard },
      { href: "/dashboard/transaksi", label: "Transaksi", icon: Receipt },
    ],
  },
  {
    label: "Katalog",
    items: [
      { href: "/dashboard/produk", label: "Produk", icon: Package },
      { href: "/dashboard/supplier", label: "Supplier", icon: Users },
    ],
  },
  {
    label: "Gudang",
    items: [
      { href: "/dashboard/purchase-order", label: "Purchase Order", icon: ShoppingBag },
      { href: "/dashboard/stock-opname", label: "Stok Opname", icon: ClipboardList },
    ],
  },
  {
    label: "Lainnya",
    items: [
      { href: "/dashboard/laporan", label: "Laporan", icon: BarChart2 },
      { href: "/dashboard/settings", label: "Pengaturan", icon: Settings },
    ],
  },
]

function DashboardDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      )}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-4 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
              <CartIcon size={13} className="text-white" />
            </div>
            <p className="font-bold text-white text-sm">Menu</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={15} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "mt-3" : ""}>
              {group.label && (
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-3 mb-1">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all mb-0.5 text-sm"
                >
                  <item.icon size={15} className="text-slate-500 shrink-0" />
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}

export default function KasirPage() {
  const { data: session } = useSession()
  const store = usePosStore()
  const isOnline = useOnlineStatus()
  const { failedCount, pendingCount, syncing, triggerSync } = useSyncStatus()

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [toast, setToast] = useState<ToastState>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [skipPrint, setSkipPrint] = useState(true)
  const [activeTab, setActiveTab] = useState<"cart" | "payment">("cart")
  const [qrisOpen, setQrisOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [receiptConfig, setReceiptConfig] = useState<{
    paperWidth?: number
    staticQrisImage?: string | null
    [key: string]: unknown
  } | null>(null)
  const receiptConfigRef = useRef<ReceiptData["config"] | null>(null)
  const serialPortRef = useRef<SerialPort | null>(null)
  const [printerConnected, setPrinterConnected] = useState(false)

  useEffect(() => {
    if (!receiptData) return

    if (serialPortRef.current) {
      printEscPos(serialPortRef.current, receiptData).catch(() => {
        setPrinterConnected(false)
        serialPortRef.current = null
      })
      return
    }

    // fallback: iframe print
    const el = document.getElementById("receipt-print")
    if (!el) return
    const paperWidth = receiptData.config.paperWidth
    const iframe = document.createElement("iframe")
    iframe.style.cssText =
      "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:0;visibility:hidden"
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument!
    const links = Array.from(document.querySelectorAll<HTMLLinkElement>("link[rel='stylesheet']"))
      .map((l) => `<link rel="stylesheet" href="${l.href}">`)
      .join("\n")
    const styles = Array.from(document.querySelectorAll("style"))
      .map((s) => `<style>${s.textContent}</style>`)
      .join("\n")
    doc.open()
    doc.write(`<!DOCTYPE html><html><head>
<meta charset="UTF-8">${links}${styles}
<style>@page{size:${paperWidth}mm auto;margin:0}html{font-size:16px}body{margin:0;padding:0;background:white}</style>
</head><body>${el.outerHTML}</body></html>`)
    doc.close()
    const doPrint = () => {
      iframe.contentWindow!.focus()
      iframe.contentWindow!.print()
      setTimeout(() => iframe.remove(), 2000)
    }
    if (links) iframe.onload = doPrint
    else setTimeout(doPrint, 50)
  }, [receiptData])

  async function connectPrinter() {
    if (!("serial" in navigator)) {
      setToast({ message: "Web Serial tidak didukung browser ini", type: "error" })
      return
    }
    try {
      const port = await navigator.serial.requestPort()
      await port.open({ baudRate: 9600 })
      serialPortRef.current = port
      setPrinterConnected(true)
      setToast({ message: "Printer terhubung", type: "success" })
    } catch {
      setToast({ message: "Gagal menghubungkan printer", type: "error" })
    }
  }

  async function disconnectPrinter() {
    if (serialPortRef.current) {
      await serialPortRef.current.close().catch(() => {})
      serialPortRef.current = null
    }
    setPrinterConnected(false)
  }

  const checkoutRef = useRef<() => void>(() => {})
  const umumIdRef = useRef<number | null>(null)
  const tunaiIdRef = useRef<number | null>(null)

  function resetPos() {
    store.reset()
    if (umumIdRef.current) store.setCustomer(umumIdRef.current)
    if (tunaiIdRef.current) store.setPaymentMethod(tunaiIdRef.current)
  }

  function isQrisMethod(id: number | null): boolean {
    if (!id) return false
    const method = paymentMethods.find((pm) => pm.id === id)
    return !!method && method.name.toLowerCase().includes("qris")
  }

  function handleQrisCheckout() {
    if (store.items.length === 0 || !store.paymentMethodId) return
    setQrisOpen(true)
  }

  async function handleQrisConfirm() {
    if (!store.paymentMethodId || store.items.length === 0) return
    setLoading(true)
    let res: Response
    try {
      const localId = crypto.randomUUID()
      res = await fetch("/api/transactions", {
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
          discountId: store.discountIds[0] ?? null,
          paymentMethodId: store.paymentMethodId,
          paymentAmount: store.getTotal(),
          localId,
        }),
      })
    } finally {
      setLoading(false)
    }
    if (!res!.ok) {
      const err = await res!.json()
      setToast({ message: (err as { error?: string }).error ?? "Transaksi gagal", type: "error" })
      return
    }
    const tx = await res.json()
    setQrisOpen(false)
    if (!skipPrint) {
      const config = receiptConfigRef.current!
      setReceiptData({
        transactionId: tx.id,
        createdAt: tx.createdAt,
        cashierName: session?.user?.name ?? "-",
        customerName: tx.customer?.name,
        items: tx.items.map((item: Record<string, any>) => ({
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
      })
    }
    resetPos()
    setActiveTab("cart")
    setToast({ message: "Pembayaran QRIS berhasil", type: "success" })
    document.querySelector<HTMLInputElement>("[data-search-input]")?.focus()
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/payment-methods").then((r) => r.json()),
      fetch("/api/discounts?active=true").then((r) => r.json()),
      fetch("/api/customers").then((r) => r.json()),
      fetch("/api/receipt-config").then((r) => r.json()),
    ]).then(async ([pms, disc, cust, config]) => {
      receiptConfigRef.current = config
      setReceiptConfig(config)
      const activePms: PaymentMethod[] = pms.filter(
        (p: Record<string, unknown>) => p.isActive !== false,
      )
      setPaymentMethods(activePms)
      const tunai = activePms.find((pm) => pm.name.toLowerCase().includes("tunai"))
      tunaiIdRef.current = (tunai ?? activePms[0])?.id ?? null
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
        store.setCustomer(umum.id)
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
    if (isQrisMethod(store.paymentMethodId)) {
      await handleQrisCheckout()
      return
    }
    if (!store.paymentMethodId || store.items.length === 0) return
    const total = store.getTotal()
    if (store.paymentAmount < total) return

    setLoading(true)

    const localId = crypto.randomUUID()
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
        discountId: store.discountIds[0] ?? null,
        paymentMethodId: store.paymentMethodId,
        paymentAmount: store.paymentAmount,
        localId,
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
      const config = receiptConfigRef.current!
      const receipt: ReceiptData = {
        transactionId: tx.id,
        createdAt: tx.createdAt,
        cashierName: session?.user?.name ?? "-",
        customerName: tx.customer?.name,
        items: tx.items.map((item: Record<string, any>) => ({
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
    }

    resetPos()
    setActiveTab("cart")
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
        resetPos()
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
      <DashboardDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <header className="bg-slate-900 border-b border-slate-800 px-5 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-xs"
          >
            <LayoutDashboard size={14} />
            Dashboard
          </button>
          <div className="w-px h-4 bg-slate-700" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-white text-sm">Kasir</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isOnline && (
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              OFFLINE
            </span>
          )}
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded text-xs text-slate-400 bg-slate-800">
              {pendingCount} pending
            </span>
          )}
          {failedCount > 0 && (
            <a
              href="/kasir/sync-failures"
              className="px-2 py-0.5 rounded text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30"
            >
              {failedCount} gagal
            </a>
          )}
          {isOnline && typeof window !== "undefined" && window.electronAPI && (
            <button
              onClick={triggerSync}
              disabled={syncing}
              className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 disabled:opacity-40"
            >
              {syncing ? "Sync..." : "Sync"}
            </button>
          )}
        </div>
      </header>

      {/* Shortcut hint bar — lg+ only */}
      <div className="hidden lg:flex items-center gap-3 px-5 py-1.5 bg-slate-950 border-b border-slate-800 text-xs text-slate-500 shrink-0">
        <kbd className="bg-slate-800 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded font-mono">
          /
        </kbd>
        <span>Cari</span>
        <span className="text-slate-700">·</span>
        <kbd className="bg-slate-800 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded font-mono">
          F2
        </kbd>
        <span>Bayar</span>
        <span className="text-slate-700">·</span>
        <kbd className="bg-slate-800 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded font-mono">
          F8
        </kbd>
        <span>Selesai</span>
        <span className="text-slate-700">·</span>
        <kbd className="bg-slate-800 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded font-mono">
          Esc
        </kbd>
        <span>Kembali</span>
      </div>

      <BarcodeListener onScan={handleScan} />

      {/* Mobile tab bar — hidden at md+ */}
      <div className="md:hidden flex shrink-0 border-b border-gray-200 bg-white">
        <button
          onClick={() => setActiveTab("cart")}
          className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
            activeTab === "cart"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500"
          }`}
        >
          <CartIcon size={15} />
          Keranjang
          {store.items.length > 0 && (
            <span className="bg-indigo-600 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">
              {store.items.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("payment")}
          className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
            activeTab === "payment"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500"
          }`}
        >
          <CreditCard size={15} />
          Bayar
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          className={cn(
            "flex-col overflow-hidden bg-white border-r border-gray-200 flex-1",
            activeTab === "cart" ? "flex" : "hidden md:flex",
          )}
        >
          <div className="p-3 bg-gray-50 border-b border-gray-200">
            <ProductSearch onSelect={handleSearchSelect} />
          </div>
          {!isOnline && (
            <p className="text-xs text-amber-400 text-center py-1 bg-amber-500/10">
              Stok mungkin tidak akurat (mode offline)
            </p>
          )}
          <CartPanel
            onClear={
              store.items.length > 0
                ? () => {
                    resetPos()
                  }
                : undefined
            }
            onGoToPayment={() => setActiveTab("payment")}
          />
        </div>

        <div
          className={cn(
            "shrink-0 overflow-y-auto bg-gray-50 p-4 md:p-5 w-full md:w-70 xl:w-92",
            activeTab === "payment" ? "flex flex-col" : "hidden md:flex md:flex-col",
          )}
        >
          <PaymentPanel
            paymentMethods={paymentMethods}
            discounts={discounts}
            customers={customers}
            onCheckout={handleCheckout}
            loading={loading}
            skipPrint={skipPrint}
            onSkipPrintChange={setSkipPrint}
            onBack={() => setActiveTab("cart")}
            isQris={isQrisMethod(store.paymentMethodId)}
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 px-5 py-1.5 relative flex items-center shrink-0">
        <span className="text-xs text-slate-500">{session?.user?.name}</span>
        <div className="absolute left-1/2 -translate-x-1/2">
          <Clock />
        </div>
      </footer>

      {/* Printer FAB */}
      <button
        onClick={printerConnected ? disconnectPrinter : connectPrinter}
        title={printerConnected ? "Putuskan printer" : "Hubungkan printer ESC/POS"}
        className={cn(
          "fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full shadow-lg transition-all duration-200",
          printerConnected
            ? "bg-emerald-600 text-white px-4 py-3 hover:bg-emerald-700 shadow-emerald-900/40"
            : "bg-slate-800 text-slate-300 px-4 py-3 hover:bg-slate-700 border border-slate-700",
        )}
      >
        {printerConnected ? (
          <>
            <div className="relative shrink-0">
              <Printer size={16} />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-300 animate-pulse" />
            </div>
            <span className="text-sm font-semibold hidden sm:inline">Terhubung</span>
          </>
        ) : (
          <>
            <Unplug size={16} />
            <span className="text-sm font-semibold hidden sm:inline">Hubungkan</span>
          </>
        )}
      </button>

      {qrisOpen && (
        <QrisModal
          qrString={process.env.NEXT_PUBLIC_QRIS_STRING ?? ""}
          total={store.getTotal()}
          onConfirm={handleQrisConfirm}
          onCancel={() => setQrisOpen(false)}
          loading={loading}
          isOffline={!isOnline}
          staticQrisImage={receiptConfig?.staticQrisImage ?? null}
        />
      )}

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
