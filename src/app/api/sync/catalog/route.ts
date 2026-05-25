import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-sync-secret")
  if (!secret || secret !== process.env.SYNC_SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const since = req.nextUrl.searchParams.get("since")
  const sinceDate = since ? new Date(since) : null

  const [variants, paymentMethods, discounts, customers, receiptConfig, users, suppliers] =
    await Promise.all([
      prisma.productVariant.findMany({
        ...(sinceDate ? { where: { updatedAt: { gt: sinceDate } } } : {}),
        include: { product: { select: { name: true, category: true } } },
      }),
      prisma.paymentMethod.findMany(
        sinceDate ? { where: { updatedAt: { gt: sinceDate } } } : undefined,
      ),
      prisma.discount.findMany(sinceDate ? { where: { updatedAt: { gt: sinceDate } } } : undefined),
      prisma.customer.findMany(sinceDate ? { where: { updatedAt: { gt: sinceDate } } } : undefined),
      prisma.receiptConfig.findUnique({ where: { id: 1 } }),
      prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          roleId: true,
          isActive: true,
          createdAt: true,
        },
      }),
      prisma.supplier.findMany(sinceDate ? { where: { updatedAt: { gt: sinceDate } } } : undefined),
    ])

  return NextResponse.json({
    variants,
    paymentMethods,
    discounts,
    customers,
    receiptConfig,
    users,
    suppliers,
    syncedAt: new Date().toISOString(),
  })
}
