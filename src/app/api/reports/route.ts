import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns"

export async function GET(req: NextRequest) {
  const period = new URL(req.url).searchParams.get("period") ?? "today"
  const now = new Date()

  const dateRange = {
    today: { gte: startOfDay(now), lte: endOfDay(now) },
    week: { gte: startOfWeek(now, { weekStartsOn: 1 }), lte: endOfWeek(now, { weekStartsOn: 1 }) },
    month: { gte: startOfMonth(now), lte: endOfMonth(now) },
    last30: { gte: subDays(now, 30), lte: now },
  }[period] ?? { gte: startOfDay(now), lte: endOfDay(now) }

  const [transactions, topVariants, allLowCandidates] = await Promise.all([
    prisma.transaction.findMany({
      where: { createdAt: dateRange, status: "COMPLETED" },
      select: { total: true, createdAt: true },
    }),
    prisma.transactionItem.groupBy({
      by: ["productVariantId"],
      where: { transaction: { createdAt: dateRange, status: "COMPLETED" } },
      _sum: { qty: true, subtotal: true },
      orderBy: { _sum: { qty: "desc" } },
      take: 10,
    }),
    prisma.productVariant.findMany({
      where: { stock: { lte: 50 } },
      include: { product: { select: { name: true } } },
      orderBy: { stock: "asc" },
    }),
  ])

  const lowStock = allLowCandidates
    .filter((v) => v.stock <= v.lowStockThreshold)
    .slice(0, 20)

  const topVariantIds = topVariants.map((v) => v.productVariantId)
  const variantDetails = await prisma.productVariant.findMany({
    where: { id: { in: topVariantIds } },
    include: { product: { select: { name: true } } },
  })

  const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.total), 0)
  const totalTransactions = transactions.length

  return NextResponse.json({
    summary: { totalRevenue, totalTransactions, averageTransaction: totalTransactions > 0 ? totalRevenue / totalTransactions : 0 },
    topProducts: topVariants.map((tv) => {
      const v = variantDetails.find((vd) => vd.id === tv.productVariantId)
      return { name: v ? `${v.product.name} ${v.variantName}` : `#${tv.productVariantId}`, qty: tv._sum.qty ?? 0, revenue: Number(tv._sum.subtotal ?? 0) }
    }),
    lowStock: lowStock.map((v) => ({ id: v.id, name: `${v.product.name} ${v.variantName}`, stock: v.stock, threshold: v.lowStockThreshold, unit: v.unit })),
  })
}
