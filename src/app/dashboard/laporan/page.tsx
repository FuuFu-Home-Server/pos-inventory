"use client"

import { useState, useEffect, useCallback } from "react"
import { formatRupiah } from "@/lib/format"
import { Badge } from "@/components/ui/Badge"

type Report = {
  summary: { totalRevenue: number; totalTransactions: number; averageTransaction: number }
  topProducts: { name: string; qty: number; revenue: number }[]
  lowStock: { id: number; name: string; stock: number; threshold: number; unit: string }[]
  paymentBreakdown: { name: string; count: number; revenue: number }[]
  topCustomers: { name: string; count: number; spend: number }[]
  categoryBreakdown: { category: string; revenue: number; qty: number }[]
}

const PERIODS = [
  { value: "today", label: "Hari Ini" },
  { value: "week", label: "Minggu Ini" },
  { value: "month", label: "Bulan Ini" },
  { value: "last30", label: "30 Hari Terakhir" },
]

function Bar({ value, max, color = "bg-indigo-500" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.max((value / max) * 100, 2) : 0
  return (
    <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function StatCard({ label, value, sub, color, accent }: { label: string; value: string; sub?: string; color: string; accent?: string }) {
  return (
    <div className={`bg-white border rounded-xl p-5 shadow-sm ${accent ?? "border-gray-200"}`}>
      <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-2">{label}</p>
      <p className={`text-2xl font-black tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function LaporanPage() {
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Laporan Penjualan</h1>
          <p className="text-sm text-gray-500 mt-0.5">Analisis performa toko</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-1.5 text-sm rounded-lg transition-all font-medium ${
                period === p.value ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
          <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          Memuat data...
        </div>
      )}

      {report && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              label="Total Pendapatan"
              value={formatRupiah(report.summary.totalRevenue)}
              sub={`${report.summary.totalTransactions} transaksi selesai`}
              color="text-emerald-700"
              accent="border-emerald-100"
            />
            <StatCard
              label="Jumlah Transaksi"
              value={report.summary.totalTransactions.toLocaleString("id-ID")}
              sub="transaksi dalam periode"
              color="text-indigo-700"
            />
            <StatCard
              label="Rata-rata / Transaksi"
              value={formatRupiah(report.summary.averageTransaction)}
              sub="per checkout"
              color="text-purple-700"
            />
            <StatCard
              label="Stok Menipis"
              value={String(report.lowStock.length)}
              sub={report.lowStock.length === 0 ? "Semua stok aman" : "produk perlu restok"}
              color={report.lowStock.length > 0 ? "text-amber-700" : "text-gray-500"}
              accent={report.lowStock.length > 0 ? "border-amber-200 bg-amber-50" : "border-gray-200"}
            />
          </div>

          {/* Main grid: products + right sidebar */}
          <div className="grid grid-cols-3 gap-6">
            {/* Top products */}
            <div className="col-span-2 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">10 Produk Terlaris</h2>
              {report.topProducts.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">Belum ada data penjualan</p>
              ) : (
                <div className="space-y-2.5">
                  {report.topProducts.map((p, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-300 w-5 text-right shrink-0">{i + 1}</span>
                      <div className="w-40 shrink-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.qty} terjual</p>
                      </div>
                      <Bar value={p.revenue} max={maxRevenue} color="bg-indigo-400" />
                      <span className="text-xs font-bold text-gray-700 w-28 text-right shrink-0 tabular-nums">
                        {formatRupiah(p.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right sidebar: payment + customers */}
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Metode Pembayaran</h2>
                {report.paymentBreakdown.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Tidak ada data</p>
                ) : (
                  <div className="space-y-2.5">
                    {report.paymentBreakdown.map((p, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-20 shrink-0">
                          <p className="text-xs font-semibold text-gray-700 truncate">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.count}×</p>
                        </div>
                        <Bar value={p.count} max={maxPayCount} color="bg-emerald-400" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Top Pelanggan</h2>
                {report.topCustomers.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Tidak ada transaksi dengan pelanggan</p>
                ) : (
                  <div className="space-y-2">
                    {report.topCustomers.map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-300 w-4 text-right shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.count} transaksi</p>
                        </div>
                        <span className="text-xs font-bold text-gray-700 tabular-nums shrink-0">{formatRupiah(c.spend)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Category + Low Stock */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Pendapatan per Kategori</h2>
              {report.categoryBreakdown.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Tidak ada data</p>
              ) : (
                <div className="space-y-2.5">
                  {report.categoryBreakdown.map((c, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-28 shrink-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{c.category}</p>
                        <p className="text-xs text-gray-400">{c.qty} unit</p>
                      </div>
                      <Bar value={c.revenue} max={maxCatRev} color="bg-purple-400" />
                      <span className="text-xs font-bold text-gray-700 w-24 text-right shrink-0 tabular-nums">
                        {formatRupiah(c.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
                Stok Menipis
                {report.lowStock.length > 0 && (
                  <span className="ml-2 text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    {report.lowStock.length}
                  </span>
                )}
              </h2>
              {report.lowStock.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
                  <svg className="w-10 h-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm">Semua stok aman</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {report.lowStock.map((v) => (
                    <div key={v.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <div className="min-w-0 mr-3">
                        <p className="text-xs font-semibold text-gray-800 truncate">{v.name}</p>
                        <p className="text-xs text-gray-400">min. {v.threshold} {v.unit}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-bold text-gray-700 tabular-nums">{v.stock} {v.unit}</span>
                        <Badge variant={v.stock === 0 ? "danger" : "warning"}>
                          {v.stock === 0 ? "Habis" : "Menipis"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top customers by spend bar chart */}
          {report.topCustomers.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Pengeluaran Top Pelanggan</h2>
              <div className="space-y-2.5">
                {report.topCustomers.map((c, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-300 w-5 text-right shrink-0">{i + 1}</span>
                    <div className="w-36 shrink-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.count} transaksi</p>
                    </div>
                    <Bar value={c.spend} max={maxSpend} color="bg-rose-400" />
                    <span className="text-xs font-bold text-gray-700 w-28 text-right shrink-0 tabular-nums">
                      {formatRupiah(c.spend)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
