"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { ReceiptData } from "@/components/receipt/ReceiptTemplate"

export type Transaction = {
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

export type TxDetail = Transaction & {
  items: {
    id: number
    qty: number
    unitPrice: number
    itemDiscountAmt: number
    subtotal: number
    productVariant: { variantName: string; unit: string; product: { name: string } }
  }[]
}

export type PaymentMethod = { id: number; name: string }
export type User = { id: number; name: string }

const EMPTY = ""

export function useTransactions() {
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

  return {
    transactions,
    total,
    totalRevenue,
    completedCount,
    page,
    setPage,
    pageSize,
    setPageSize,
    expandedId,
    details,
    loadingId,
    receiptData,
    previewReceipt,
    setPreviewReceipt,
    toast,
    setToast,
    receiptPreviewRef,
    paymentMethods,
    users,
    filterFrom,
    setFilterFrom,
    filterTo,
    setFilterTo,
    filterPayment,
    setFilterPayment,
    filterUser,
    setFilterUser,
    toggleDetail,
    handlePreview,
    handleDownload,
    resetFilters,
    hasFilters,
  }
}
