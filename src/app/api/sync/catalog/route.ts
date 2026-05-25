import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-sync-secret")
  if (!secret || secret !== process.env.SYNC_SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const since = req.nextUrl.searchParams.get("since")
  const sinceDate = since ? new Date(since) : undefined

  const where = sinceDate ? { updatedAt: { gt: sinceDate } } : {}

  const [variants, paymentMethods, discounts, customers, receiptConfig, users, suppliers] =
    await Promise.all([
      prisma.productVariant.findMany({
        where,
        include: { product: { select: { name: true, category: true } } },
      }),
      prisma.paymentMethod.findMany({ where }),
      prisma.discount.findMany({ where }),
      prisma.customer.findMany({ where }),
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
      prisma.supplier.findMany({ where }),
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
