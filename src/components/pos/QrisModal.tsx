"use client"

import { useEffect, useRef, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { formatRupiah } from "@/lib/format"
import { CheckCircle2, X, QrCode } from "lucide-react"

interface QrisModalProps {
  qrString: string
  orderId: string
  total: number
  onSuccess: (transactionId: number) => void
  onCancel: () => void
}

type PollStatus = "pending" | "settlement" | "expire" | "cancel" | "deny"

export function QrisModal({ qrString, orderId, total, onSuccess, onCancel }: QrisModalProps) {
  const [status, setStatus] = useState<PollStatus>("pending")
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onSuccessRef = useRef(onSuccess)
  useEffect(() => {
    onSuccessRef.current = onSuccess
  }, [onSuccess])

  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/qris/${encodeURIComponent(orderId)}/status`)
        if (!res.ok) return
        const data: { status: string; transactionId?: number } = await res.json()

        if (data.status === "settlement" || data.status === "capture") {
          if (!data.transactionId) return
          clearInterval(intervalRef.current!)
          setStatus("settlement")
          successTimerRef.current = setTimeout(
            () => onSuccessRef.current(data.transactionId!),
            1500,
          )
        } else if (data.status === "expire" || data.status === "cancel" || data.status === "deny") {
          clearInterval(intervalRef.current!)
          setStatus(data.status as PollStatus)
        }
      } catch {}
    }, 3000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    }
  }, [orderId])

  const isTerminal = status !== "pending"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <QrCode size={18} className="text-indigo-400" />
            <div>
              <p className="font-bold text-white text-sm">Bayar via QRIS</p>
              <p className="text-xs text-slate-400">Scan dengan e-wallet atau m-banking</p>
            </div>
          </div>
          {!isTerminal && (
            <button
              onClick={onCancel}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col items-center gap-5">
          {status === "settlement" ? (
            <>
              <CheckCircle2 size={72} className="text-emerald-500" />
              <div className="text-center">
                <p className="text-lg font-black text-gray-900">Pembayaran Berhasil</p>
                <p className="text-sm text-gray-500 mt-1">{formatRupiah(total)}</p>
              </div>
            </>
          ) : status === "expire" || status === "cancel" || status === "deny" ? (
            <>
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <X size={32} className="text-red-500" />
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-gray-900">
                  {status === "expire" ? "QR Kadaluarsa" : "Pembayaran Dibatalkan"}
                </p>
                <p className="text-sm text-gray-500 mt-1">Silakan coba lagi</p>
              </div>
              <button
                onClick={onCancel}
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Kembali ke Kasir
              </button>
            </>
          ) : (
            <>
              <div className="p-3 border-4 border-indigo-100 rounded-xl">
                <QRCodeSVG value={qrString} size={200} level="M" />
              </div>
              <div className="text-center">
                <p className="text-2xl font-black tabular-nums text-gray-900">
                  {formatRupiah(total)}
                </p>
                <p className="text-xs text-gray-400 mt-1">GoPay · OVO · Dana · BCA · dan lainnya</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                Menunggu konfirmasi pembayaran...
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
