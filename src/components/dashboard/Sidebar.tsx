"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Truck,
  Users,
  ShoppingBag,
  ClipboardList,
  Tag,
  BarChart2,
  Printer,
  UserCog,
  Upload,
  LogOut,
  Receipt,
  Layers,
  Ruler,
  BookOpen,
  ListChecks,
  X,
} from "lucide-react"

type NavItem = { href: string; label: string; icon: React.ElementType; exact?: boolean }
type NavGroup = { label: string | null; items: NavItem[] }

const navGroups: NavGroup[] = [
  {
    label: null,
    items: [
      { href: "/dashboard", label: "Beranda", icon: LayoutDashboard, exact: true },
      { href: "/kasir", label: "Kasir", icon: ShoppingCart },
      { href: "/dashboard/transaksi", label: "Transaksi", icon: Receipt },
    ],
  },
  {
    label: "Katalog",
    items: [
      { href: "/dashboard/produk", label: "Produk", icon: Package },
      { href: "/dashboard/kategori", label: "Kategori", icon: Layers },
      { href: "/dashboard/satuan", label: "Satuan", icon: Ruler },
      { href: "/dashboard/supplier", label: "Supplier", icon: Truck },
    ],
  },
  {
    label: "Gudang",
    items: [
      { href: "/dashboard/purchase-order", label: "Purchase Order", icon: ShoppingBag },
      { href: "/dashboard/daftar-belanja", label: "Daftar Belanja", icon: ListChecks },
      { href: "/dashboard/stock-opname", label: "Stok Opname", icon: ClipboardList },
    ],
  },
  {
    label: "Bisnis",
    items: [
      { href: "/dashboard/customer", label: "Pelanggan", icon: Users },
      { href: "/dashboard/diskon", label: "Diskon", icon: Tag },
      { href: "/dashboard/akuntansi", label: "Akuntansi", icon: BookOpen },
      { href: "/dashboard/laporan", label: "Laporan", icon: BarChart2 },
    ],
  },
  {
    label: "Pengaturan",
    items: [
      { href: "/dashboard/struk", label: "Struk", icon: Printer },
      { href: "/dashboard/pengguna", label: "Pengguna", icon: UserCog },
      { href: "/dashboard/import", label: "Import GDB", icon: Upload },
    ],
  },
]

interface SidebarProps {
  userName: string
  userRole: string
  open: boolean
  onClose: () => void
}

export function Sidebar({ userName, userRole, open, onClose }: SidebarProps) {
  const pathname = usePathname()

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href
    return pathname.startsWith(item.href)
  }

  return (
    <>
      {/* Backdrop — mobile only, when open */}
      {open && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />}

      <aside
        aria-label="Navigasi"
        className={cn(
          "flex flex-col bg-slate-900 h-screen",
          // Mobile: fixed overlay, full sidebar width
          "fixed inset-y-0 left-0 z-40 w-56",
          // Transition for mobile slide-in
          "transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
          // lg+: relative in flow, icon rail width, always visible
          "lg:relative lg:translate-x-0 lg:w-[68px] lg:z-auto",
          // xl+: full sidebar width
          "xl:w-56",
        )}
      >
        {/* Logo */}
        <div className="px-3 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
              <ShoppingCart size={15} className="text-white" />
            </div>
            <div className="block lg:hidden xl:block min-w-0">
              <p className="font-bold text-white text-sm leading-tight">Kasir</p>
              <p className="text-xs text-slate-400">POS & Inventori</p>
            </div>
          </div>
          {/* Close button — mobile overlay only */}
          <button
            onClick={onClose}
            aria-label="Tutup menu"
            className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {navGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "mt-3" : ""}>
              {group.label && (
                <p className="block lg:hidden xl:block text-[10px] font-bold text-slate-600 uppercase tracking-widest px-3 mb-1">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const active = isActive(item)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    title={item.label}
                    className={cn(
                      "flex items-center rounded-lg transition-all mb-0.5",
                      // lg (rail): icon centered, fixed size
                      "lg:w-[52px] lg:h-10 lg:justify-center lg:px-0 lg:py-0",
                      // xl (full): icon + label inline
                      "xl:w-auto xl:h-auto xl:justify-start xl:px-3 xl:py-2 xl:gap-2.5",
                      // Mobile (overlay full sidebar): icon + label
                      "px-3 py-2 gap-2.5",
                      active
                        ? "bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-900/40"
                        : "text-slate-400 hover:text-white hover:bg-slate-800",
                    )}
                  >
                    <item.icon
                      size={15}
                      className={cn("shrink-0", active ? "text-white" : "text-slate-500")}
                    />
                    <span className="lg:hidden xl:inline text-sm">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* User / Logout */}
        <div className="p-2 border-t border-slate-800">
          <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="block lg:hidden xl:block min-w-0">
              <p className="text-xs font-semibold text-white truncate">{userName}</p>
              <p className="text-xs text-slate-500">{userRole}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={cn(
              "flex items-center rounded-lg text-xs text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-colors w-full",
              "lg:w-[52px] lg:h-10 lg:justify-center lg:px-0",
              "xl:w-auto xl:h-auto xl:justify-start xl:px-3 xl:py-2 xl:gap-2.5",
              "px-3 py-2 gap-2.5",
            )}
            title="Keluar"
          >
            <LogOut size={14} />
            <span className="lg:hidden xl:inline">Keluar</span>
          </button>
        </div>
      </aside>
    </>
  )
}
