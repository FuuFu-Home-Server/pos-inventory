import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
} from "date-fns"

export async function GET(req: NextRequest) {
  const period = new URL(req.url).searchParams.get("period") ?? "today"
  const now = new Date()

  const dateRange = {
    today: { gte: startOfDay(now), lte: endOfDay(now) },
    week: { gte: startOfWeek(now, { weekStartsOn: 1 }), lte: endOfWeek(now, { weekStartsOn: 1 }) },
    month: { gte: startOfMonth(now), lte: endOfMonth(now) },
    last30: { gte: subDays(now, 30), lte: now },
  }[period] ?? { gte: startOfDay(now), lte: endOfDay(now) }

  const [
    transactions,
    topVariants,
    allLowCandidates,
    paymentBreakdown,
    topCustomers,
    categoryBreakdown,
  ] = await Promise.all([
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
    prisma.$queryRaw<{ name: string; count: number; revenue: number }[]>`
      SELECT pm.name, COUNT(t.id) as count, SUM(t.total) as revenue
      FROM "Transaction" t
      JOIN "PaymentMethod" pm ON pm.id = t."paymentMethodId"
      WHERE t.status = 'COMPLETED'
        AND t."createdAt" >= ${dateRange.gte}
        AND t."createdAt" <= ${dateRange.lte}
      GROUP BY pm.id, pm.name
      ORDER BY count DESC
    `,
    prisma.$queryRaw<{ name: string; count: number; spend: number }[]>`
      SELECT c.name, COUNT(t.id) as count, SUM(t.total) as spend
      FROM "Transaction" t
      JOIN "Customer" c ON c.id = t."customerId"
      WHERE t.status = 'COMPLETED'
        AND t."createdAt" >= ${dateRange.gte}
        AND t."createdAt" <= ${dateRange.lte}
        AND t."customerId" IS NOT NULL
      GROUP BY c.id, c.name
      ORDER BY spend DESC
      LIMIT 8
    `,
    prisma.$queryRaw<{ category: string; revenue: number; qty: number }[]>`
      SELECT p.category, SUM(ti.subtotal) as revenue, SUM(ti.qty) as qty
      FROM "TransactionItem" ti
      JOIN "ProductVariant" pv ON pv.id = ti."productVariantId"
      JOIN "Product" p ON p.id = pv."productId"
      JOIN "Transaction" t ON t.id = ti."transactionId"
      WHERE t.status = 'COMPLETED'
        AND t."createdAt" >= ${dateRange.gte}
        AND t."createdAt" <= ${dateRange.lte}
      GROUP BY p.category
      ORDER BY revenue DESC
    `,
  ])

  const lowStock = allLowCandidates.filter((v) => v.stock <= v.lowStockThreshold).slice(0, 20)

  const topVariantIds = topVariants.map((v) => v.productVariantId)
  const variantDetails = await prisma.productVariant.findMany({
    where: { id: { in: topVariantIds } },
    include: { product: { select: { name: true } } },
  })

  const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.total), 0)
  const totalTransactions = transactions.length

  return NextResponse.json({
    summary: {
      totalRevenue,
      totalTransactions,
      averageTransaction: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
    },
    topProducts: topVariants.map((tv) => {
      const v = variantDetails.find((vd) => vd.id === tv.productVariantId)
      return {
        name: v ? `${v.product.name} ${v.variantName}` : `#${tv.productVariantId}`,
        qty: tv._sum.qty ?? 0,
        revenue: Number(tv._sum.subtotal ?? 0),
      }
    }),
    lowStock: lowStock.map((v) => ({
      id: v.id,
      name: `${v.product.name} ${v.variantName}`,
      stock: v.stock,
      threshold: v.lowStockThreshold,
      unit: v.unit,
    })),
    paymentBreakdown: paymentBreakdown.map((p) => ({
      name: p.name,
      count: Number(p.count),
      revenue: Number(p.revenue),
    })),
    topCustomers: topCustomers.map((c) => ({
      name: c.name,
      count: Number(c.count),
      spend: Number(c.spend),
    })),
    categoryBreakdown: categoryBreakdown.map((c) => ({
      category: c.category,
      revenue: Number(c.revenue),
      qty: Number(c.qty),
    })),
  })
}
