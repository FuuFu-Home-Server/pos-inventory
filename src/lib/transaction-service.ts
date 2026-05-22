import { calcTransactionDiscount } from "@/lib/discount-calc"
import { prisma } from "@/lib/prisma"

type ItemInput = {
  qty: number
  unitPrice: number
  itemDiscountAmt: number
}

type DiscountInput = {
  type: "PERCENT" | "FLAT"
  value: number
  scope: "TRANSACTION" | "PRODUCT"
  minPurchase: number | null
} | null

export function buildTransactionTotals(items: ItemInput[], discount: DiscountInput) {
  const subtotal = items.reduce((sum, i) => sum + i.qty * i.unitPrice - i.itemDiscountAmt, 0)
  const discountAmount = discount ? calcTransactionDiscount(subtotal, discount) : 0
  const total = Math.max(0, subtotal - discountAmount)
  return { subtotal, discountAmount, total }
}

export async function completePendingTransaction(transactionId: number) {
  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({
      where: { id: transactionId },
      include: { items: true },
    })
    if (!transaction || transaction.status !== "PENDING") {
      throw new Error("NOT_PENDING")
    }
    await tx.transaction.update({
      where: { id: transactionId },
      data: { status: "COMPLETED" },
    })
    await Promise.all(
      transaction.items.map((item) =>
        tx.productVariant.update({
          where: { id: item.productVariantId },
          data: { stock: { decrement: item.qty } },
        }),
      ),
    )
    return tx.transaction.findUnique({
      where: { id: transactionId },
      include: {
        items: {
          include: {
            productVariant: { include: { product: { select: { name: true } } } },
          },
        },
        paymentMethod: true,
        customer: true,
        user: { select: { name: true } },
        discount: true,
      },
    })
  })
}
