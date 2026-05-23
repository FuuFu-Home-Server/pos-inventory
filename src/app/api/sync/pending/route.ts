import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const limit = Math.min(100, Number(req.nextUrl.searchParams.get("limit") ?? 100))

  const [transactions, purchaseOrders] = await Promise.all([
    prisma.transaction.findMany({
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
    }),
    prisma.purchaseOrder.findMany({
      where: { syncStatus: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: limit,
      include: {
        supplier: {
          select: { id: true, name: true, phone: true, address: true, contactPerson: true },
        },
        items: {
          select: {
            productVariantId: true,
            qty: true,
            unitCost: true,
            subtotal: true,
          },
        },
      },
    }),
  ])

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
    purchaseOrders: purchaseOrders.map((po) => ({
      localId: po.localId,
      supplierId: po.supplierId,
      supplier: po.supplier ?? null,
      userId: po.userId,
      status: po.status,
      notes: po.notes,
      createdAt: po.createdAt.toISOString(),
      receivedAt: po.receivedAt?.toISOString() ?? null,
      items: po.items.map((i) => ({
        variantId: i.productVariantId,
        qty: i.qty,
        unitCost: Number(i.unitCost),
        subtotal: Number(i.subtotal),
      })),
    })),
  })
}
