import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

const statusSchema = z.object({ status: z.enum(["RECEIVED", "CANCELLED"]) })

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const order = await prisma.purchaseOrder.findUnique({
    where: { id: Number(id) },
    include: {
      supplier: true,
      user: { select: { name: true } },
      items: {
        include: {
          productVariant: { include: { product: { select: { name: true } } } },
        },
      },
    },
  })
  if (!order) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 })
  return NextResponse.json(order)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const parsed = statusSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const order = await prisma.purchaseOrder.findUnique({
    where: { id: Number(id) },
    include: { items: true },
  })
  if (!order) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 })
  if (order.status !== "DRAFT") {
    return NextResponse.json(
      { error: `PO sudah ${order.status}, tidak bisa diubah` },
      { status: 409 },
    )
  }

  if (parsed.data.status === "RECEIVED") {
    await prisma.$transaction(async (tx) => {
      await Promise.all(
        order.items.map((item) =>
          tx.productVariant.update({
            where: { id: item.productVariantId },
            data: { stock: { increment: item.qty } },
          }),
        ),
      )
      await tx.purchaseOrder.update({
        where: { id: Number(id) },
        data: { status: "RECEIVED", receivedAt: new Date() },
      })
    })
  } else {
    await prisma.purchaseOrder.update({
      where: { id: Number(id) },
      data: { status: "CANCELLED" },
    })
  }

  return NextResponse.json({ ok: true })
}
