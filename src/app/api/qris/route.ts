import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildTransactionTotals } from "@/lib/transaction-service"
import { createQrisCharge, generateOrderId } from "@/lib/midtrans"
import { z } from "zod"

const schema = z.object({
  items: z.array(
    z.object({
      variantId: z.number().int().positive(),
      qty: z.number().int().positive(),
      unitPrice: z.number().nonnegative(),
      itemDiscountAmt: z.number().nonnegative(),
    }),
  ),
  customerId: z.number().int().positive().nullable().optional(),
  discountId: z.number().int().positive().nullable().optional(),
  paymentMethodId: z.number().int().positive(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const { items, customerId, discountId, paymentMethodId } = parsed.data

  const discount = discountId
    ? await prisma.discount.findUnique({ where: { id: discountId } })
    : null

  const { subtotal, discountAmount, total } = buildTransactionTotals(
    items,
    discount
      ? {
          type: discount.type as "PERCENT" | "FLAT",
          value: Number(discount.value),
          scope: discount.scope as "TRANSACTION" | "PRODUCT",
          minPurchase: discount.minPurchase ? Number(discount.minPurchase) : null,
        }
      : null,
  )

  const orderId = generateOrderId()

  const transaction = await prisma.transaction.create({
    data: {
      userId: Number(session.user.id),
      customerId: customerId ?? null,
      discountId: discountId ?? null,
      paymentMethodId,
      discountAmount,
      subtotal,
      total,
      paymentAmount: total,
      changeAmount: 0,
      status: "PENDING",
      midtransOrderId: orderId,
      items: {
        create: items.map((item) => ({
          productVariantId: item.variantId,
          qty: item.qty,
          unitPrice: item.unitPrice,
          itemDiscountAmt: item.itemDiscountAmt,
          subtotal: item.qty * item.unitPrice - item.itemDiscountAmt,
        })),
      },
    },
  })

  let qrString: string
  try {
    const charge = await createQrisCharge(orderId, total)
    qrString = charge.qr_string
  } catch (err) {
    await prisma.transaction.delete({ where: { id: transaction.id } })
    console.error("Midtrans charge error:", err)
    return NextResponse.json({ error: "Gagal membuat QRIS" }, { status: 502 })
  }

  return NextResponse.json({ transactionId: transaction.id, orderId, qrString }, { status: 201 })
}
