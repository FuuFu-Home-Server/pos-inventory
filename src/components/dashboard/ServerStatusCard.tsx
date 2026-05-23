"use client"

import Link from "next/link"
import { Store, ArrowRight } from "lucide-react"
import { useOnlineStatus } from "@/hooks/useOnlineStatus"

export function ServerStatusCard() {
  const isOnline = useOnlineStatus()

  const inner = (
    <div
      className={`bg-white border rounded-2xl p-4 md:p-5 flex items-center gap-3 md:flex-col md:items-start transition-all duration-200 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50 cursor-pointer ${
        isOnline ? "border-gray-200" : "border-amber-200 bg-amber-50/40"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          isOnline ? "bg-emerald-500" : "bg-amber-500"
        }`}
      >
        <Store size={18} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-base font-black tabular-nums md:text-lg lg:text-xl xl:text-2xl leading-tight ${
            isOnline ? "text-gray-900" : "text-amber-700"
          }`}
        >
          {isOnline ? "Online" : "Offline"}
        </p>
        <p
          className={`text-xs font-semibold mt-0.5 ${isOnline ? "text-gray-500" : "text-amber-600"}`}
        >
          Toko
        </p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">
          {isOnline ? "terhubung ke server" : "tidak ada koneksi server"}
        </p>
      </div>
      <ArrowRight size={14} className="text-gray-300 shrink-0 md:hidden" />
    </div>
  )

  return <Link href="/dashboard/settings">{inner}</Link>
}
