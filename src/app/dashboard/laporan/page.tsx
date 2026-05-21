"use client"

import { useState, useEffect, useCallback } from "react"
import { formatRupiah } from "@/lib/format"
import { Badge } from "@/components/ui/Badge"
import { Table, Thead, Tbody, Th, Td } from "@/components/ui/Table"

type Report = {
  summary: { totalRevenue: number; totalTransactions: number; averageTransaction: number }
  topProducts: { name: string; qty: number; revenue: number }[]
  lowStock: { id: number; name: string; stock: number; threshold: number; unit: string }[]
}

const PERIODS = [
  { value: "today", label: "Hari Ini" },
  { value: "week", label: "Minggu Ini" },
  { value: "month", label: "Bulan Ini" },
  { value: "last30", label: "30 Hari Terakhir" },
]

export default function LaporanPage() {
  const [period, setPeriod] = useState("today")
  const [report, setReport] = useState<Report | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/reports?period=${period}`)
    setReport(await res.json())
  }, [period])

  useEffect(() => { load() }, [load])

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Laporan</h1>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${period === p.value ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {report && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: "Total Pendapatan", value: formatRupiah(report.summary.totalRevenue), color: "text-green-700" },
              { label: "Jumlah Transaksi", value: report.summary.totalTransactions.toString(), color: "text-blue-700" },
              { label: "Rata-rata Transaksi", value: formatRupiah(report.summary.averageTransaction), color: "text-purple-700" },
            ].map((card) => (
              <div key={card.label} className="bg-white border border-gray-200 rounded-lg p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{card.label}</p>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h2 className="text-base font-semibold text-gray-700 mb-3">10 Produk Terlaris</h2>
              <Table>
                <Thead><tr><Th>Produk</Th><Th className="text-right">Qty</Th><Th className="text-right">Omset</Th></tr></Thead>
                <Tbody>
                  {report.topProducts.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <Td className="text-sm">{p.name}</Td>
                      <Td className="text-right text-gray-600">{p.qty}</Td>
                      <Td className="text-right font-medium">{formatRupiah(p.revenue)}</Td>
                    </tr>
                  ))}
                </Tbody>
              </Table>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-700 mb-3">Stok Menipis</h2>
              <Table>
                <Thead><tr><Th>Produk</Th><Th className="text-right">Stok</Th><Th>Status</Th></tr></Thead>
                <Tbody>
                  {report.lowStock.length === 0 ? (
                    <tr><Td colSpan={3} className="text-center text-gray-400 py-4">Semua stok aman</Td></tr>
                  ) : report.lowStock.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <Td className="text-sm">{v.name}</Td>
                      <Td className="text-right font-semibold">{v.stock} {v.unit}</Td>
                      <Td><Badge variant={v.stock === 0 ? "danger" : "warning"}>{v.stock === 0 ? "Habis" : "Menipis"}</Badge></Td>
                    </tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
