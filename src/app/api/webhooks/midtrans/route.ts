import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyWebhookSignature } from "@/lib/midtrans"
import { completePendingTransaction } from "@/lib/transaction-service"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    order_id,
    status_code,
    gross_amount,
    signature_key,
    transaction_status,
  }: {
    order_id: string
    status_code: string
    gross_amount: string
    signature_key: string
    transaction_status: string
  } = body

  if (!verifyWebhookSignature(order_id, status_code, gross_amount, signature_key)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const transaction = await prisma.transaction.findUnique({
    where: { midtransOrderId: order_id },
  })
  if (!transaction) return NextResponse.json({ ok: true })

  if (
    (transaction_status === "settlement" || transaction_status === "capture") &&
    transaction.status === "PENDING"
  ) {
    await completePendingTransaction(transaction.id).catch(() => {})
  } else if (
    (transaction_status === "expire" ||
      transaction_status === "cancel" ||
      transaction_status === "deny") &&
    transaction.status === "PENDING"
  ) {
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: "CANCELLED" },
    })
  }

  return NextResponse.json({ ok: true })
}
