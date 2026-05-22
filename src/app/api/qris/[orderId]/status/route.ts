import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getQrisStatus } from "@/lib/midtrans"
import { completePendingTransaction } from "@/lib/transaction-service"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orderId } = await params

  const transaction = await prisma.transaction.findUnique({
    where: { midtransOrderId: orderId },
  })
  if (!transaction) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (transaction.status === "COMPLETED") {
    return NextResponse.json({ status: "settlement", transactionId: transaction.id })
  }
  if (transaction.status === "CANCELLED") {
    return NextResponse.json({ status: "cancel" })
  }

  const mtStatus = await getQrisStatus(orderId)

  if (mtStatus.transaction_status === "settlement" || mtStatus.transaction_status === "capture") {
    try {
      const completed = await completePendingTransaction(transaction.id)
      const transactionId = completed?.id ?? transaction.id
      return NextResponse.json({ status: "settlement", transactionId })
    } catch (e) {
      if (e instanceof Error && e.message === "NOT_PENDING") {
        return NextResponse.json({ status: "settlement", transactionId: transaction.id })
      }
      throw e
    }
  }

  if (
    mtStatus.transaction_status === "expire" ||
    mtStatus.transaction_status === "cancel" ||
    mtStatus.transaction_status === "deny"
  ) {
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: "CANCELLED" },
    })
    return NextResponse.json({ status: mtStatus.transaction_status })
  }

  return NextResponse.json({ status: mtStatus.transaction_status })
}
