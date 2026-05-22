import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const limit = Math.min(100, Number(req.nextUrl.searchParams.get("limit") ?? 100))

  const transactions = await prisma.transaction.findMany({
    where: { syncStatus: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: {
      items: {
        select: {
          productVariantId: true,
          qty: true,
          unitPrice: true,
          itemDiscountAmt: true,
        },
      },
    },
  })

  return NextResponse.json({
    transactions: transactions.map((tx) => ({
      localId: tx.localId,
      customerId: tx.customerId,
      discountId: tx.discountId,
      paymentMethodId: tx.paymentMethodId,
      paymentAmount: Number(tx.paymentAmount),
      createdAt: tx.createdAt.toISOString(),
      items: tx.items.map((i) => ({
        variantId: i.productVariantId,
        qty: i.qty,
        unitPrice: Number(i.unitPrice),
        itemDiscountAmt: Number(i.itemDiscountAmt),
      })),
    })),
  })
}
