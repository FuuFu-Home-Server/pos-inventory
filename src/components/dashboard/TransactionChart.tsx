"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { formatRupiah } from "@/lib/format"
import { useState } from "react"

export type ChartDataPoint = {
  label: string
  revenue: number
  count: number
}

type TooltipPayloadItem = { dataKey: string; value: number; color: string }
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-xs">
      <p className="font-bold text-gray-700 mb-1.5">Tgl {label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span className="text-gray-500">
            {p.dataKey === "revenue" ? "Pendapatan" : "Transaksi"}
          </span>
          <span className="font-semibold" style={{ color: p.color }}>
            {p.dataKey === "revenue" ? formatRupiah(p.value) : `${p.value}×`}
          </span>
        </div>
      ))}
    </div>
  )
}

function CustomDot(props: { cx?: number; cy?: number; value?: number; stroke?: string }) {
  const { cx, cy, value, stroke } = props
  if (!value) return null
  return <circle cx={cx} cy={cy} r={3} fill={stroke} stroke="white" strokeWidth={1.5} />
}

export function TransactionChart({
  data,
  monthName,
}: {
  data: ChartDataPoint[]
  monthName: string
}) {
  const [view, setView] = useState<"revenue" | "count">("revenue")

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 [&_svg]:outline-none">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-black text-gray-900">Tren Penjualan</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Harian — {monthName} {new Date().getFullYear()}
          </p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setView("revenue")}
            className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${view === "revenue" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            Pendapatan
          </button>
          <button
            onClick={() => setView("count")}
            className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${view === "count" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            Transaksi
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart tabIndex={-1} data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            interval={1}
            tickFormatter={(v) => (Number(v) % 2 === 1 ? v : "")}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={
              view === "revenue"
                ? (v) => (v === 0 ? "0" : `${(v / 1_000_000).toFixed(0)}jt`)
                : undefined
            }
            width={view === "revenue" ? 44 : 32}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#e2e8f0", strokeWidth: 1 }} />
          {view === "revenue" ? (
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#colorRevenue)"
              dot={<CustomDot stroke="#6366f1" />}
              activeDot={{ r: 6, fill: "#6366f1", stroke: "white", strokeWidth: 2 }}
            />
          ) : (
            <Area
              type="monotone"
              dataKey="count"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#colorCount)"
              dot={<CustomDot stroke="#10b981" />}
              activeDot={{ r: 6, fill: "#10b981", stroke: "white", strokeWidth: 2 }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
