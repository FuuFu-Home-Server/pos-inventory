"use client"

import { useState, type ReactNode } from "react"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { Menu, ShoppingCart } from "lucide-react"

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
        <main className="flex-1 overflow-auto min-h-0">{children}</main>
      </div>
    </div>
  )
}
