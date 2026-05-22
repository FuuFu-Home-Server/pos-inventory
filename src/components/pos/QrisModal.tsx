"use client"

import { formatRupiah } from "@/lib/format"
import { QRCodeSVG } from "qrcode.react"
import { QrCode } from "lucide-react"

interface QrisModalProps {
  qrString: string
  total: number
  onConfirm: () => Promise<void>
  onCancel: () => void
  loading: boolean
}

export function QrisModal({ qrString, total, onConfirm, onCancel, loading }: QrisModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="bg-slate-900 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <QrCode size={18} className="text-indigo-400" />
            <div>
              <p className="font-bold text-white text-sm">Bayar via QRIS</p>
              <p className="text-xs text-slate-400">Scan dengan e-wallet atau m-banking</p>
            </div>
          </div>
        </div>

        <div className="p-6 flex flex-col items-center gap-5">
          {qrString ? (
            <div className="p-3 border-4 border-indigo-100 rounded-xl">
              <QRCodeSVG value={qrString} size={200} level="M" />
            </div>
          ) : (
            <div className="w-50 h-50 border-4 border-dashed border-gray-200 rounded-xl flex items-center justify-center">
              <p className="text-xs text-gray-400 text-center px-4">Set NEXT_PUBLIC_QRIS_STRING</p>
            </div>
          )}

          <div className="text-center">
            <p className="text-2xl font-black tabular-nums text-gray-900">{formatRupiah(total)}</p>
            <p className="text-xs text-gray-400 mt-1">GoPay · OVO · Dana · BCA · dan lainnya</p>
          </div>

          <div className="flex flex-col gap-2 w-full">
            <button
              onClick={onConfirm}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-sm transition-colors"
            >
              {loading ? "Memproses..." : "✓  Konfirmasi Pembayaran"}
            </button>
            <button
              onClick={onCancel}
              disabled={loading}
              className="w-full py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-60 text-gray-600 font-medium text-sm transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
