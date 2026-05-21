"use client"

import { formatRupiah, formatDate } from "@/lib/format"
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownLeft } from "lucide-react"
import { useAccounting } from "./useAccounting"

export default function AkuntansiPage() {
  const { data, loading, filterFrom, setFilterFrom, filterTo, setFilterTo, resetFilters } = useAccounting()
  const hasFilters = filterFrom || filterTo

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-2xl font-black text-gray-900">Akuntansi</h1>
        <p className="text-sm text-gray-500 mt-0.5">Arus uang masuk dan keluar</p>
      </div>

      {/* Summary cards */}
      {data && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className={`rounded-2xl p-5 ${data.balance >= 0 ? "bg-emerald-500" : "bg-red-500"} text-white`}>
            <div className="flex items-center justify-between mb-3">
              <Wallet size={20} className="opacity-80" />
              <span className="text-xs font-semibold opacity-70">SALDO</span>
            </div>
            <p className="text-2xl font-black tabular-nums">{formatRupiah(data.balance)}</p>
            <p className="text-xs opacity-70 mt-1">{data.balance >= 0 ? "Surplus" : "Defisit"}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                <TrendingUp size={16} className="text-emerald-600" />
              </div>
              <ArrowUpRight size={14} className="text-emerald-400" />
            </div>
            <p className="text-xl font-black text-gray-900 tabular-nums">{formatRupiah(data.totalIncome)}</p>
            <p className="text-xs text-gray-500 mt-1">Total Pemasukan</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                <TrendingDown size={16} className="text-red-500" />
              </div>
              <ArrowDownLeft size={14} className="text-red-400" />
            </div>
            <p className="text-xl font-black text-gray-900 tabular-nums">{formatRupiah(data.totalExpense)}</p>
            <p className="text-xs text-gray-500 mt-1">Total Pengeluaran</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Dari</label>
          <input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Sampai</label>
          <input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {hasFilters && (
          <button onClick={resetFilters} className="text-xs text-red-500 hover:text-red-700 font-medium pb-0.5 self-end">
            Reset filter
          </button>
        )}
      </div>

      {/* Ledger */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Riwayat Transaksi Keuangan</span>
          <span className="text-xs text-gray-400">{data?.entries.length ?? 0} entri</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
            <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            Memuat data...
          </div>
        ) : !data || data.entries.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">Tidak ada data</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {data.entries.map((entry) => (
              <div key={entry.id} className="flex items-center px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mr-4 ${entry.type === "income" ? "bg-emerald-100" : "bg-red-100"}`}>
                  {entry.type === "income"
                    ? <ArrowUpRight size={15} className="text-emerald-600" />
                    : <ArrowDownLeft size={15} className="text-red-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{entry.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(entry.date)}</p>
                </div>
                <div className="text-right ml-4 shrink-0">
                  <p className={`text-sm font-black tabular-nums ${entry.type === "income" ? "text-emerald-600" : "text-red-500"}`}>
                    {entry.type === "income" ? "+" : "−"}{formatRupiah(entry.amount)}
                  </p>
                  <p className="text-xs text-gray-400">{{ TRANSACTION: "Penjualan", PURCHASE_ORDER: "Pembelian PO", PURCHASE_LIST: "Daftar Belanja" }[entry.ref.type] ?? entry.ref.type}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
