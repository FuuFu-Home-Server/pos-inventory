import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const listId = Number(id)

  const list = await prisma.purchaseList.findUnique({
    where: { id: listId },
    include: { items: true },
  })
  if (!list) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 })
  if (list.status === "DONE") return NextResponse.json({ error: "Sudah selesai" }, { status: 409 })
  if (list.items.length === 0) return NextResponse.json({ error: "List kosong" }, { status: 400 })

  let po: { id: number; skippedItems: number }
  try {
    const result = await prisma.$transaction(async (tx) => {
      const linkedItems = list.items.filter((item) => item.productVariantId !== null)
      const skippedCount = list.items.length - linkedItems.length

      const purchaseOrder = await tx.purchaseOrder.create({
        data: {
          supplierId: null,
          userId: Number(session.user!.id),
          status: "RECEIVED",
          notes: `Dari daftar belanja: ${list.title}`,
          receivedAt: new Date(),
          items: {
            create: linkedItems.map((item) => ({
              productVariantId: item.productVariantId!,
              qty: item.qty,
              unitCost: item.unitCost,
              subtotal: item.qty * Number(item.unitCost),
            })),
          },
        },
      })

      await Promise.all(
        linkedItems.map((item) =>
          tx.productVariant.update({
            where: { id: item.productVariantId! },
            data: { stock: { increment: item.qty } },
          }),
        ),
      )

      await tx.purchaseList.update({
        where: { id: listId },
        data: { status: "DONE" },
      })

      return { purchaseOrder, skippedItems: skippedCount }
    })
    po = { id: result.purchaseOrder.id, skippedItems: result.skippedItems }
  } catch {
    return NextResponse.json({ error: "Gagal membuat PO" }, { status: 500 })
  }

  return NextResponse.json(
    { purchaseOrderId: po.id, skippedItems: po.skippedItems },
    { status: 201 },
  )
}
