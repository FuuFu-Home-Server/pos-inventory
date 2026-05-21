import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const transaction = await prisma.transaction.findUnique({
    where: { id: Number(id) },
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
  if (!transaction) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 })
  return NextResponse.json(transaction)
}
