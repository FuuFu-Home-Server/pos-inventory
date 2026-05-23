"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { PageTransition } from "@/components/PageTransition"
import {
  Menu,
  RefreshCw,
  ShoppingCart,
  Package,
  ShoppingBag,
  BarChart2,
  Zap,
  X,
  Check,
} from "lucide-react"

interface DashboardShellProps {
  userName: string
  userRole: string
  children: ReactNode
}

export function DashboardShell({ userName, userRole, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="h-screen overflow-hidden flex bg-slate-50">
      <Sidebar
        userName={userName}
        userRole={userRole}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header — hidden at lg+ where sidebar is always visible */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Buka menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
              <ShoppingCart size={13} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">Kasir</span>
          </div>
        </header>
        <PageTransition className="flex-1 overflow-auto min-h-0">{children}</PageTransition>
      </div>
      <QuickFab />
    </div>
  )
}

const quickLinks = [
  {
    href: "/kasir",
    label: "Buka Kasir",
    desc: "Mulai transaksi",
    icon: ShoppingCart,
    color: "bg-indigo-500",
  },
  {
    href: "/dashboard/produk",
    label: "Produk",
    desc: "Kelola katalog",
    icon: Package,
    color: "bg-emerald-500",
  },
  {
    href: "/dashboard/purchase-order",
    label: "Pembelian",
    desc: "Buat & terima PO",
    icon: ShoppingBag,
    color: "bg-amber-500",
  },
  {
    href: "/dashboard/laporan",
    label: "Laporan",
    desc: "Laporan penjualan",
    icon: BarChart2,
    color: "bg-purple-500",
  },
]

function QuickFab() {
  const [open, setOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [done, setDone] = useState(false)
  const isElectron = typeof window !== "undefined" && !!window.electronAPI
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onOutside)
    return () => document.removeEventListener("mousedown", onOutside)
  }, [])

  async function handleSync() {
    if (syncing || !isElectron) return
    setSyncing(true)
    await window.electronAPI!.triggerSync()
    setSyncing(false)
    setDone(true)
    setTimeout(() => setDone(false), 2000)
  }

  return (
    <div ref={ref} className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {/* Drawer */}
      {open && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden w-56">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Akses Cepat</p>
          </div>
          <div className="p-2">
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <div
                  className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center shrink-0`}
                >
                  <item.icon size={15} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 leading-tight">{item.label}</p>
                  <p className="text-xs text-gray-400 truncate">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
          {isElectron && (
            <div className="px-2 pb-2 border-t border-gray-100 pt-1">
              <button
                onClick={handleSync}
                disabled={syncing}
                className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  done ? "text-emerald-600 bg-emerald-50" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {done ? (
                  <>
                    <Check size={15} className="text-emerald-500" /> Tersinkron
                  </>
                ) : (
                  <>
                    <RefreshCw
                      size={15}
                      className={syncing ? "animate-spin text-indigo-500" : "text-gray-400"}
                    />{" "}
                    Sinkronisasi
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* FAB trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all ${
          open ? "bg-gray-800 hover:bg-gray-700" : "bg-indigo-600 hover:bg-indigo-700"
        } text-white`}
        title="Akses Cepat"
      >
        {open ? <X size={18} /> : <Zap size={18} />}
      </button>
    </div>
  )
}
