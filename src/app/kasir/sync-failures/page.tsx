"use client"

import { useEffect, useState } from "react"
import { formatRupiah } from "@/lib/format"
import { AlertTriangle, RefreshCw, X } from "lucide-react"

type FailedTx = {
  id: number
  localId: string | null
  total: number
  syncFailReason: string | null
  createdAt: string
  items: {
    qty: number
    productVariant: { variantName: string; product: { name: string } }
  }[]
}

export default function SyncFailuresPage() {
  const [transactions, setTransactions] = useState<FailedTx[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const res = await fetch("/api/transactions?syncStatus=FAILED&limit=50")
    const data = await res.json()
    setTransactions(data.transactions ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function dismiss(id: number) {
    const res = await fetch(`/api/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ syncStatus: "DISMISSED" }),
    })
    if (res.ok) setTransactions((prev) => prev.filter((t) => t.id !== id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Memuat...</div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
        <RefreshCw size={32} className="opacity-30" />
        <p className="text-sm">Tidak ada transaksi gagal</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <AlertTriangle size={20} className="text-amber-400" />
        <h1 className="text-lg font-bold text-white">Transaksi Gagal Sinkronisasi</h1>
        <span className="ml-auto text-xs text-slate-400">{transactions.length} transaksi</span>
      </div>
      <div className="flex flex-col gap-3">
        {transactions.map((tx) => (
          <div key={tx.id} className="bg-slate-800 rounded-xl p-4 border border-amber-500/20">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold">{formatRupiah(Number(tx.total))}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(tx.createdAt).toLocaleString("id-ID")}
                </p>
                {tx.syncFailReason && (
                  <p className="text-xs text-amber-400 mt-1">Gagal: {tx.syncFailReason}</p>
                )}
                <p className="text-xs text-slate-300 mt-1 truncate">
                  {tx.items?.map((i) => `${i.productVariant.product.name} ×${i.qty}`).join(", ")}
                </p>
              </div>
              <button
                onClick={() => dismiss(tx.id)}
                className="text-slate-500 hover:text-slate-300 p-1 flex-shrink-0"
                title="Hapus dari daftar"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
