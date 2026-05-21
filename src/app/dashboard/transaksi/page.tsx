"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { formatRupiah, formatDate } from "@/lib/format"
import { Badge } from "@/components/ui/Badge"
import { Select } from "@/components/ui/Select"
import { Table, Thead, Tbody, Th, Td } from "@/components/ui/Table"
import { ReceiptTemplate, type ReceiptData } from "@/components/receipt/ReceiptTemplate"
import { Toast } from "@/components/ui/Toast"
import { ChevronDown, Printer, Eye, X, Download } from "lucide-react"
import { Pagination } from "@/components/ui/Pagination"

type Transaction = {
  id: number
  createdAt: string
  status: string
  subtotal: number
  discountAmount: number
  total: number
  paymentAmount: number
  changeAmount: number
  user: { name: string }
  customer: { name: string } | null
  paymentMethod: { name: string }
  _count: { items: number }
}

type TxDetail = Transaction & {
  items: {
    id: number
    qty: number
    unitPrice: number
    itemDiscountAmt: number
    subtotal: number
    productVariant: { variantName: string; unit: string; product: { name: string } }
  }[]
}

type PaymentMethod = { id: number; name: string }
type User = { id: number; name: string }

const EMPTY = ""

export default function TransaksiPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [details, setDetails] = useState<Record<number, TxDetail>>({})
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [previewReceipt, setPreviewReceipt] = useState<ReceiptData | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const receiptPreviewRef = useRef<HTMLDivElement>(null)

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [users, setUsers] = useState<User[]>([])

  const [filterFrom, setFilterFrom] = useState(EMPTY)
  const [filterTo, setFilterTo] = useState(EMPTY)
  const [filterPayment, setFilterPayment] = useState(EMPTY)
  const [filterUser, setFilterUser] = useState(EMPTY)

  const buildQuery = useCallback(() => {
    const p = new URLSearchParams({ page: String(page), limit: String(pageSize) })
    if (filterFrom) p.set("from", filterFrom)
    if (filterTo) p.set("to", filterTo)
    if (filterPayment) p.set("paymentMethodId", filterPayment)
    if (filterUser) p.set("userId", filterUser)
    return p.toString()
  }, [page, pageSize, filterFrom, filterTo, filterPayment, filterUser])

  const load = useCallback(async () => {
    const res = await fetch(`/api/transactions?${buildQuery()}`)
    const data = await res.json()
    setTransactions(data.transactions ?? [])
    setTotal(data.total ?? 0)
    setTotalRevenue(data.totalRevenue ?? 0)
    setCompletedCount(data.completedCount ?? 0)
  }, [buildQuery])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    Promise.all([
      fetch("/api/payment-methods").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ]).then(([pms, usr]) => {
      setPaymentMethods(pms ?? [])
      setUsers(usr.users ?? [])
    })
  }, [])

  async function toggleDetail(id: number) {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (details[id]) return
    setLoadingId(id)
    const res = await fetch(`/api/transactions/${id}`)
    const data = await res.json()
    setDetails((prev) => ({ ...prev, [id]: data }))
    setLoadingId(null)
  }

  async function handlePreview(detail: TxDetail) {
    const config = await fetch("/api/receipt-config").then((r) => r.json())
    const receipt: ReceiptData = {
      transactionId: detail.id,
      createdAt: detail.createdAt,
      cashierName: detail.user.name,
      customerName: detail.customer?.name,
      items: detail.items.map((item) => ({
        productName: item.productVariant.product.name,
        variantName: item.productVariant.variantName,
        unit: item.productVariant.unit,
        qty: item.qty,
        unitPrice: Number(item.unitPrice),
        itemDiscountAmt: Number(item.itemDiscountAmt),
        subtotal: Number(item.subtotal),
      })),
      subtotal: Number(detail.subtotal),
      discountAmount: Number(detail.discountAmount),
      total: Number(detail.total),
      paymentAmount: Number(detail.paymentAmount),
      changeAmount: Number(detail.changeAmount),
      paymentMethod: detail.paymentMethod.name,
      config,
    }
    setReceiptData(receipt)
    setPreviewReceipt(receipt)
  }

  async function handleDownload() {
    if (!receiptPreviewRef.current || !previewReceipt) return
    const { toPng } = await import("html-to-image")
    const dataUrl = await toPng(receiptPreviewRef.current, { pixelRatio: 3, backgroundColor: "#ffffff" })
    const a = document.createElement("a")
    a.href = dataUrl
    a.download = `struk-${previewReceipt.transactionId}.png`
    a.click()
    setPreviewReceipt(null)
    setToast(`Struk #${previewReceipt.transactionId} berhasil diunduh`)
  }

  function resetFilters() {
    setFilterFrom(EMPTY)
    setFilterTo(EMPTY)
    setFilterPayment(EMPTY)
    setFilterUser(EMPTY)
    setPage(1)
  }

  const hasFilters = filterFrom || filterTo || filterPayment || filterUser

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Riwayat Transaksi</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} transaksi</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-white border border-emerald-100 rounded-xl p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Total Pendapatan</p>
          <p className="text-xl font-black text-emerald-700 tabular-nums">{formatRupiah(totalRevenue)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{completedCount} transaksi selesai</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Total Transaksi</p>
          <p className="text-xl font-black text-gray-900 tabular-nums">{total.toLocaleString("id-ID")}</p>
          <p className="text-xs text-gray-400 mt-0.5">semua status</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Rata-rata / Transaksi</p>
          <p className="text-xl font-black text-gray-900 tabular-nums">{formatRupiah(completedCount > 0 ? totalRevenue / completedCount : 0)}</p>
          <p className="text-xs text-gray-400 mt-0.5">per checkout selesai</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Dari</label>
          <input
            type="date"
            value={filterFrom}
            onChange={(e) => { setFilterFrom(e.target.value); setPage(1) }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:border-gray-400 transition-colors"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Sampai</label>
          <input
            type="date"
            value={filterTo}
            onChange={(e) => { setFilterTo(e.target.value); setPage(1) }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:border-gray-400 transition-colors"
          />
        </div>
        <div className="w-44">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Pembayaran</label>
          <Select
            value={filterPayment}
            onChange={(v) => { setFilterPayment(v); setPage(1) }}
            options={paymentMethods.map((p) => ({ value: String(p.id), label: p.name }))}
            placeholder="Semua metode"
          />
        </div>
        <div className="w-44">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Kasir</label>
          <Select
            value={filterUser}
            onChange={(v) => { setFilterUser(v); setPage(1) }}
            options={users.map((u) => ({ value: String(u.id), label: u.name }))}
            placeholder="Semua kasir"
          />
        </div>
        {hasFilters && (
          <button
            onClick={resetFilters}
            className="text-xs text-red-500 hover:text-red-700 font-medium pb-0.5 self-end"
          >
            Reset filter
          </button>
        )}
      </div>

      <Table>
        <Thead>
          <tr>
            <Th>#</Th>
            <Th>Waktu</Th>
            <Th>Kasir</Th>
            <Th>Pelanggan</Th>
            <Th>Item</Th>
            <Th>Metode</Th>
            <Th className="text-right">Total</Th>
          </tr>
        </Thead>
        <Tbody>
          {transactions.map((tx) => {
            const isExpanded = expandedId === tx.id
            const detail = details[tx.id]
            const isLoading = loadingId === tx.id

            return (
              <>
                <tr
                  key={tx.id}
                  className={`cursor-pointer select-none transition-colors ${isExpanded ? "bg-indigo-50" : "hover:bg-gray-50"}`}
                  onClick={() => toggleDetail(tx.id)}
                >
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <ChevronDown size={13} className={`text-gray-400 transition-transform duration-150 shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                      <span className="text-gray-400 font-mono text-xs">#{tx.id}</span>
                    </div>
                  </Td>
                  <Td className="text-xs text-gray-600 whitespace-nowrap">{formatDate(tx.createdAt)}</Td>
                  <Td className="text-sm">{tx.user.name}</Td>
                  <Td className="text-sm text-gray-600">{tx.customer?.name ?? <span className="text-gray-300">—</span>}</Td>
                  <Td><Badge variant="info">{tx._count.items} item</Badge></Td>
                  <Td className="text-sm">{tx.paymentMethod.name}</Td>
                  <Td className="text-right font-bold tabular-nums">{formatRupiah(Number(tx.total))}</Td>
                </tr>

                {isExpanded && (
                  <tr key={`${tx.id}-detail`}>
                    <td colSpan={7} className="px-0 py-0 border-b border-indigo-100">
                      <div className="bg-indigo-50/60 border-t border-indigo-100 px-6 py-4">
                        {isLoading ? (
                          <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                            Memuat detail...
                          </div>
                        ) : detail ? (
                          <div className="grid grid-cols-[220px_1fr_200px] gap-8 w-full">
                            {/* Meta info */}
                            <div className="space-y-1 text-xs">
                              <div className="flex gap-3">
                                <span className="text-gray-500 w-20">Kasir</span>
                                <span className="font-medium text-gray-800">{detail.user.name}</span>
                              </div>
                              <div className="flex gap-3">
                                <span className="text-gray-500 w-20">Pelanggan</span>
                                <span className="font-medium text-gray-800">{detail.customer?.name ?? "—"}</span>
                              </div>
                              <div className="flex gap-3">
                                <span className="text-gray-500 w-20">Metode</span>
                                <span className="font-medium text-gray-800">{detail.paymentMethod.name}</span>
                              </div>
                              <div className="flex gap-3">
                                <span className="text-gray-500 w-20">Waktu</span>
                                <span className="font-medium text-gray-800">{formatDate(detail.createdAt)}</span>
                              </div>
                            </div>

                            {/* Items */}
                            <div className="min-w-0">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-gray-400 border-b border-indigo-100">
                                    <th className="text-left font-semibold pb-1.5">Produk</th>
                                    <th className="text-center font-semibold pb-1.5">Qty</th>
                                    <th className="text-right font-semibold pb-1.5">Harga</th>
                                    <th className="text-right font-semibold pb-1.5">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-indigo-100/60">
                                  {detail.items.map((item) => (
                                    <tr key={item.id}>
                                      <td className="py-1.5 text-gray-800 font-medium">
                                        {item.productVariant.product.name} <span className="text-gray-500">{item.productVariant.variantName}</span>
                                      </td>
                                      <td className="py-1.5 text-center text-gray-600">{item.qty} {item.productVariant.unit}</td>
                                      <td className="py-1.5 text-right text-gray-600 tabular-nums">{formatRupiah(Number(item.unitPrice))}</td>
                                      <td className="py-1.5 text-right font-semibold tabular-nums">{formatRupiah(Number(item.subtotal))}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Totals + reprint */}
                            <div className="text-xs space-y-1 text-right">
                              <div className="flex justify-between gap-6">
                                <span className="text-gray-500">Subtotal</span>
                                <span className="tabular-nums">{formatRupiah(Number(detail.subtotal))}</span>
                              </div>
                              {Number(detail.discountAmount) > 0 && (
                                <div className="flex justify-between gap-6 text-emerald-600">
                                  <span>Diskon</span>
                                  <span className="tabular-nums">−{formatRupiah(Number(detail.discountAmount))}</span>
                                </div>
                              )}
                              <div className="flex justify-between gap-6 font-black text-sm text-gray-900 pt-1 border-t border-indigo-200">
                                <span>Total</span>
                                <span className="tabular-nums">{formatRupiah(Number(detail.total))}</span>
                              </div>
                              <div className="flex justify-between gap-6 text-gray-500">
                                <span>Bayar</span>
                                <span className="tabular-nums">{formatRupiah(Number(detail.paymentAmount))}</span>
                              </div>
                              <div className="flex justify-between gap-6 text-gray-500">
                                <span>Kembali</span>
                                <span className="tabular-nums">{formatRupiah(Number(detail.changeAmount))}</span>
                              </div>
                              <div className="pt-3">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handlePreview(detail) }}
                                  className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold border border-indigo-200 hover:border-indigo-400 rounded-lg px-3 py-1.5 transition-colors ml-auto"
                                >
                                  <Eye size={12} />
                                  Preview Struk
                                </button>
                              </div>
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

      {receiptData && (
        <div className="hidden print:block">
          <ReceiptTemplate data={receiptData} />
        </div>
      )}

      {previewReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setPreviewReceipt(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
                <span className="text-sm font-bold text-gray-800">Preview Struk #{previewReceipt.transactionId}</span>
                <button onClick={() => setPreviewReceipt(null)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors">
                  <X size={15} />
                </button>
              </div>
              <div className="p-5 overflow-y-auto max-h-[70vh]">
                <div ref={receiptPreviewRef}>
                  <ReceiptTemplate data={previewReceipt} />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setPreviewReceipt(null); setTimeout(() => window.print(), 100) }}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow transition-colors"
              >
                <Printer size={15} />
                Cetak
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow transition-colors"
              >
                <Download size={15} />
                Download PNG
              </button>
              <button
                onClick={() => setPreviewReceipt(null)}
                className="flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-xl shadow border border-gray-200 transition-colors"
              >
                <X size={15} />
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && <Toast message={toast} type="success" onDismiss={() => setToast(null)} />}
    </div>
  )
}
