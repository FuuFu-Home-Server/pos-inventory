"use client"

import { useState, useEffect, useCallback } from "react"

export type Report = {
  summary: { totalRevenue: number; totalTransactions: number; averageTransaction: number }
  topProducts: { name: string; qty: number; revenue: number }[]
  lowStock: { id: number; name: string; stock: number; threshold: number; unit: string }[]
  paymentBreakdown: { name: string; count: number; revenue: number }[]
  topCustomers: { name: string; count: number; spend: number }[]
  categoryBreakdown: { category: string; revenue: number; qty: number }[]
}

export const PERIODS = [
  { value: "today", label: "Hari Ini" },
  { value: "week", label: "Minggu Ini" },
  { value: "month", label: "Bulan Ini" },
  { value: "last30", label: "30 Hari Terakhir" },
]

export function useReports() {
  const [period, setPeriod] = useState("today")
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/reports?period=${period}`)
    setReport(await res.json())
    setLoading(false)
  }, [period])

  useEffect(() => { load() }, [load])

  const maxRevenue = report ? Math.max(...report.topProducts.map((p) => p.revenue), 1) : 1
  const maxPayCount = report ? Math.max(...report.paymentBreakdown.map((p) => p.count), 1) : 1
  const maxCatRev = report ? Math.max(...report.categoryBreakdown.map((c) => c.revenue), 1) : 1
  const maxSpend = report ? Math.max(...report.topCustomers.map((c) => c.spend), 1) : 1

  return { period, setPeriod, report, loading, maxRevenue, maxPayCount, maxCatRev, maxSpend }
}
