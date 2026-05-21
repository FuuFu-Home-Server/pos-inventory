import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { formatRupiah } from "@/lib/format"
import Link from "next/link"
import {
  ShoppingCart,
  Package,
  ShoppingBag,
  BarChart2,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Boxes,
  Users,
  ClipboardList,
  Store,
} from "lucide-react"
import { TransactionChart, type ChartDataPoint } from "@/components/dashboard/TransactionChart"

const quickLinks = [
  {
    href: "/kasir",
    label: "Buka Kasir",
    desc: "Mulai transaksi penjualan",
    icon: ShoppingCart,
    color: "bg-indigo-500",
  },
  {
    href: "/dashboard/produk",
    label: "Produk",
    desc: "Kelola katalog produk",
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
    desc: "Lihat laporan penjualan",
    icon: BarChart2,
    color: "bg-purple-500",
  },
]

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  href,
  alert,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  color: string
  href?: string
  alert?: boolean
}) {
  const inner = (
    <div
      className={`bg-white border rounded-2xl p-5 flex flex-col gap-3 transition-all duration-200 ${href ? "hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50 cursor-pointer" : ""} ${alert ? "border-amber-200 bg-amber-50/40" : "border-gray-200"}`}
    >
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0`}>
          <Icon size={18} className="text-white" />
        </div>
        {href && <ArrowRight size={14} className="text-gray-300" />}
      </div>
      <div>
        <p
          className={`text-2xl font-black tabular-nums ${alert ? "text-amber-700" : "text-gray-900"}`}
        >
          {value}
        </p>
        <p className={`text-xs font-semibold mt-0.5 ${alert ? "text-amber-600" : "text-gray-500"}`}>
          {label}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

export default async function DashboardPage() {
  const session = await auth()

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)

  const [
    revToday,
    revMonth,
    txToday,
    txMonth,
    txTotal,
    revYesterday,
    productCount,
    variantActiveCount,
    customerCount,
    pendingPO,
    lowStockRaw,
    inventoryRaw,
    monthlyRaw,
  ] = await Promise.all([
    prisma.transaction.aggregate({
      where: { status: "COMPLETED", createdAt: { gte: todayStart } },
      _sum: { total: true },
    }),
    prisma.transaction.aggregate({
      where: { status: "COMPLETED", createdAt: { gte: monthStart } },
      _sum: { total: true },
    }),
    prisma.transaction.count({ where: { status: "COMPLETED", createdAt: { gte: todayStart } } }),
    prisma.transaction.count({ where: { status: "COMPLETED", createdAt: { gte: monthStart } } }),
    prisma.transaction.count({ where: { status: "COMPLETED" } }),
    prisma.transaction.aggregate({
      where: { status: "COMPLETED", createdAt: { gte: yesterdayStart, lt: todayStart } },
      _sum: { total: true },
    }),
    prisma.product.count(),
    prisma.productVariant.count({ where: { isActive: true } }),
    prisma.customer.count(),
    prisma.purchaseOrder.count({ where: { status: "DRAFT" } }),
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count FROM "ProductVariant"
      WHERE "isActive" = true AND stock <= "lowStockThreshold"
    `,
    prisma.$queryRaw<[{ total: string | null }]>`
      SELECT SUM(stock * price)::text as total FROM "ProductVariant" WHERE "isActive" = true
    `,
    prisma.$queryRaw<{ day: Date; revenue: string; count: bigint }[]>`
      SELECT
        DATE_TRUNC('day', "createdAt") AS day,
        SUM(total)::text AS revenue,
        COUNT(*)::bigint AS count
      FROM "Transaction"
      WHERE status = 'COMPLETED'
        AND "createdAt" >= ${monthStart}
        AND "createdAt" < ${new Date(now.getFullYear(), now.getMonth() + 1, 1)}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY day ASC
    `,
  ])

  const revenueToday = Number(revToday._sum.total ?? 0)
  const revenueMonth = Number(revMonth._sum.total ?? 0)
  const revenueYesterday = Number(revYesterday._sum.total ?? 0)
  const lowStockCount = Number(lowStockRaw[0]?.count ?? 0)
  const inventoryValue = Number(inventoryRaw[0]?.total ?? 0)

  const MONTH_NAMES = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ]
  const currentMonthName = MONTH_NAMES[now.getMonth()]
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dailyMap = new Map(
    monthlyRaw.map((r) => [
      new Date(r.day).getDate(),
      { revenue: Number(r.revenue), count: Number(r.count) },
    ]),
  )
  const chartData: ChartDataPoint[] = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1
    const found = dailyMap.get(d)
    return { label: String(d), revenue: found?.revenue ?? 0, count: found?.count ?? 0 }
  })

  const hour = now.getHours()
  const greeting =
    hour < 11
      ? "Selamat pagi"
      : hour < 15
        ? "Selamat siang"
        : hour < 18
          ? "Selamat sore"
          : "Selamat malam"

  const todayVsYesterday =
    revenueYesterday > 0
      ? (((revenueToday - revenueYesterday) / revenueYesterday) * 100).toFixed(1)
      : null

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 mb-1">
          {greeting}, {session?.user.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-gray-500">Ringkasan operasional toko hari ini.</p>
      </div>

      {/* Revenue & Transactions */}
      <div className="mb-3">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
          Penjualan
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Pendapatan Hari Ini"
            value={formatRupiah(revenueToday)}
            sub={
              todayVsYesterday !== null
                ? `${Number(todayVsYesterday) >= 0 ? "+" : ""}${todayVsYesterday}% vs kemarin`
                : "Belum ada data kemarin"
            }
            icon={TrendingUp}
            color="bg-indigo-500"
            href="/dashboard/transaksi"
          />
          <StatCard
            label="Pendapatan Bulan Ini"
            value={formatRupiah(revenueMonth)}
            sub={`${txMonth} transaksi`}
            icon={BarChart2}
            color="bg-purple-500"
            href="/dashboard/laporan"
          />
          <StatCard
            label="Transaksi Hari Ini"
            value={String(txToday)}
            sub="transaksi selesai"
            icon={ShoppingCart}
            color="bg-emerald-500"
            href="/dashboard/transaksi"
          />
          <StatCard
            label="Total Transaksi"
            value={txTotal.toLocaleString("id-ID")}
            sub="sepanjang waktu"
            icon={ClipboardList}
            color="bg-sky-500"
            href="/dashboard/transaksi"
          />
        </div>
      </div>

      {/* Inventory */}
      <div className="mb-3 mt-6">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
          Inventori
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Produk Aktif"
            value={String(variantActiveCount)}
            sub={`${productCount} jenis produk`}
            icon={Package}
            color="bg-emerald-500"
            href="/dashboard/produk"
          />
          <StatCard
            label="Stok Hampir Habis"
            value={String(lowStockCount)}
            sub="varian di bawah batas minimum"
            icon={AlertTriangle}
            color={lowStockCount > 0 ? "bg-amber-500" : "bg-gray-400"}
            href="/dashboard/produk"
            alert={lowStockCount > 0}
          />
          <StatCard
            label="Nilai Inventori"
            value={formatRupiah(inventoryValue)}
            sub="estimasi harga jual × stok"
            icon={Boxes}
            color="bg-teal-500"
          />
          <StatCard
            label="PO Menunggu"
            value={String(pendingPO)}
            sub="purchase order draft"
            icon={ShoppingBag}
            color={pendingPO > 0 ? "bg-amber-500" : "bg-gray-400"}
            href="/dashboard/purchase-order"
            alert={pendingPO > 0}
          />
        </div>
      </div>

      {/* Other */}
      <div className="mb-8 mt-6">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Lainnya</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Pelanggan"
            value={customerCount.toLocaleString("id-ID")}
            sub="pelanggan terdaftar"
            icon={Users}
            color="bg-rose-500"
            href="/dashboard/pelanggan"
          />
          <StatCard
            label="Toko"
            value="Online"
            sub="sistem berjalan normal"
            icon={Store}
            color="bg-gray-400"
          />
        </div>
      </div>

      {/* Chart */}
      <div className="mt-6 mb-8">
        <TransactionChart data={chartData} monthName={currentMonthName} />
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
          Akses Cepat
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group bg-white border border-gray-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-50 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-11 h-11 rounded-xl ${item.color} flex items-center justify-center shadow-sm`}
                >
                  <item.icon size={20} className="text-white" />
                </div>
                <ArrowRight
                  size={16}
                  className="text-gray-300 group-hover:text-indigo-500 transition-colors mt-1"
                />
              </div>
              <p className="font-bold text-gray-900 mb-0.5">{item.label}</p>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
