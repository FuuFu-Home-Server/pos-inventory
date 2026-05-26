import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const since = req.nextUrl.searchParams.get("since")
  const sinceDate = since ? new Date(since) : undefined

  const where = sinceDate ? { updatedAt: { gt: sinceDate } } : {}

  const [
    roles,
    products,
    variants,
    paymentMethods,
    discounts,
    customers,
    suppliers,
    categories,
    units,
    receiptConfig,
    users,
    transactions,
    purchaseOrders,
    purchaseLists,
    stockOpnames,
  ] = await Promise.all([
    prisma.role.findMany(),
    prisma.product.findMany({ where }),
    prisma.productVariant.findMany({ where }),
    prisma.paymentMethod.findMany({ where }),
    prisma.discount.findMany({ where }),
    prisma.customer.findMany({ where }),
    prisma.supplier.findMany({ where }),
    prisma.categoryOption.findMany(),
    prisma.unitOption.findMany(),
    prisma.receiptConfig.findUnique({ where: { id: 1 } }),
    prisma.user.findMany({
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
  ])

  return NextResponse.json({
    roles,
    products,
    variants,
    paymentMethods,
    discounts,
    customers,
    suppliers,
    categories,
    units,
    receiptConfig,
    users,
    transactions,
    purchaseOrders,
    purchaseLists,
    stockOpnames,
    exportedAt: new Date().toISOString(),
  })
}
