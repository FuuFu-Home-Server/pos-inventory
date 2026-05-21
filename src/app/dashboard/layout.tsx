import { auth, signOut } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import type { ReactNode } from "react"

const navItems = [
  { href: "/dashboard", label: "Beranda" },
  { href: "/kasir", label: "Kasir" },
  { href: "/dashboard/produk", label: "Produk" },
  { href: "/dashboard/supplier", label: "Supplier" },
  { href: "/dashboard/customer", label: "Pelanggan" },
  { href: "/dashboard/purchase-order", label: "Pembelian" },
  { href: "/dashboard/stock-opname", label: "Stok Opname" },
  { href: "/dashboard/diskon", label: "Diskon" },
  { href: "/dashboard/laporan", label: "Laporan" },
  { href: "/dashboard/struk", label: "Konfigurasi Struk" },
  { href: "/dashboard/pengguna", label: "Pengguna" },
  { href: "/dashboard/import", label: "Import GDB" },
]

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") redirect("/kasir")

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-200">
          <p className="font-bold text-gray-900">Kasir Admin</p>
          <p className="text-xs text-gray-500 truncate">{session.user.name}</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-200">
          <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/login" })
            }}
          >
            <button className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md">
              Keluar
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
