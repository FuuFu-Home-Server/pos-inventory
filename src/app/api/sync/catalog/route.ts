import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-sync-secret")
  if (!secret || secret !== process.env.SYNC_SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const since = req.nextUrl.searchParams.get("since")
  const sinceDate = since ? new Date(since) : null

  const [
    roles,
    variants,
    paymentMethods,
    discounts,
    customers,
    receiptConfig,
    users,
    suppliers,
    categories,
    units,
    transactions,
    purchaseOrders,
    purchaseLists,
    stockOpnames,
    purchaseListImages,
  ] = await Promise.all([
    prisma.role.findMany(),
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
      ...(sinceDate ? { where: { updatedAt: { gt: sinceDate } } } : {}),
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        roleId: true,
        isActive: true,
        isDefaultCredential: true,
        createdAt: true,
      },
    }),
    prisma.supplier.findMany(sinceDate ? { where: { updatedAt: { gt: sinceDate } } } : undefined),
    prisma.categoryOption.findMany(),
    prisma.unitOption.findMany(),
    prisma.transaction.findMany({
      ...(sinceDate ? { where: { createdAt: { gt: sinceDate } } } : {}),
      include: { items: true },
    }),
    prisma.purchaseOrder.findMany({
      ...(sinceDate ? { where: { createdAt: { gt: sinceDate } } } : {}),
      include: { items: true },
    }),
    prisma.purchaseList.findMany({ include: { items: true } }),
    prisma.stockOpname.findMany({
      ...(sinceDate ? { where: { createdAt: { gt: sinceDate } } } : {}),
      include: { items: true },
    }),
    prisma.purchaseListImage.findMany(
      sinceDate ? { where: { createdAt: { gt: sinceDate } } } : undefined,
    ),
  ])

  return NextResponse.json({
    roles,
    variants,
    paymentMethods,
    discounts,
    customers,
    receiptConfig,
    users,
    suppliers,
    categories,
    units,
    transactions,
    purchaseOrders,
    purchaseLists,
    stockOpnames,
    purchaseListImages,
    syncedAt: new Date().toISOString(),
  })
}
