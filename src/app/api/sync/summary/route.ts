import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-sync-secret")
  if (!secret || secret !== process.env.SYNC_SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [
    roles,
    users,
    categories,
    units,
    products,
    variants,
    paymentMethods,
    discounts,
    customers,
    suppliers,
    transactions,
    purchaseOrders,
    purchaseLists,
    stockOpnames,
    receiptConfig,
  ] = await Promise.all([
    prisma.role.count(),
    prisma.user.count(),
    prisma.categoryOption.count(),
    prisma.unitOption.count(),
    prisma.product.count(),
    prisma.productVariant.count(),
    prisma.paymentMethod.count(),
    prisma.discount.count(),
    prisma.customer.count(),
    prisma.supplier.count(),
    prisma.transaction.count(),
    prisma.purchaseOrder.count(),
    prisma.purchaseList.count(),
    prisma.stockOpname.count(),
    prisma.receiptConfig.findUnique({ where: { id: 1 } }),
  ])

  return NextResponse.json({
    roles,
    users,
    categories,
    units,
    products,
    variants,
    paymentMethods,
    discounts,
    customers,
    suppliers,
    transactions,
    purchaseOrders,
    purchaseLists,
    stockOpnames,
    receiptConfig: receiptConfig ? 1 : 0,
  })
}
