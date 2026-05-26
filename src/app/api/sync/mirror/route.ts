import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST() {
  await prisma.$transaction([
    prisma.stockOpnameItem.deleteMany(),
    prisma.stockOpname.deleteMany(),
    prisma.transactionItem.deleteMany(),
    prisma.transaction.deleteMany(),
    prisma.purchaseOrderItem.deleteMany(),
    prisma.purchaseOrder.deleteMany(),
    prisma.purchaseListItem.deleteMany(),
    prisma.purchaseList.deleteMany(),
    prisma.discount.deleteMany(),
    prisma.productVariant.deleteMany(),
    prisma.product.deleteMany(),
    prisma.paymentMethod.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.categoryOption.deleteMany(),
    prisma.unitOption.deleteMany(),
    prisma.importLog.deleteMany(),
    prisma.user.deleteMany(),
    prisma.syncMeta.deleteMany(),
  ])

  return NextResponse.json({ ok: true })
}
