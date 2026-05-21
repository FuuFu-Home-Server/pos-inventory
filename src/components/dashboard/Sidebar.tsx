"use client"

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
}

export function Sidebar({ userName, userRole }: SidebarProps) {
  const pathname = usePathname()

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href
    return pathname.startsWith(item.href)
  }

  return (
    <aside className="w-56 bg-slate-900 flex flex-col h-screen sticky top-0">
      <div className="px-5 py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
            <ShoppingCart size={15} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">Kasir</p>
            <p className="text-xs text-slate-400">POS & Inventori</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-3" : ""}>
            {group.label && (
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-3 mb-1">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const active = isActive(item)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all mb-0.5",
                    active
                      ? "bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-900/40"
                      : "text-slate-400 hover:text-white hover:bg-slate-800",
                  )}
                >
                  <item.icon size={15} className={active ? "text-white" : "text-slate-500"} />
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{userName}</p>
            <p className="text-xs text-slate-500">{userRole}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-colors w-full"
        >
          <LogOut size={14} />
          Keluar
        </button>
      </div>
    </aside>
  )
}
