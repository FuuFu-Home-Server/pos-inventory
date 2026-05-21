import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

const patchSchema = z.union([
  z.object({ status: z.enum(["OPEN", "DONE"]) }),
  z.object({ itemId: z.number().int(), isPurchased: z.boolean() }),
])

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const list = await prisma.purchaseList.findUnique({
    where: { id: Number(id) },
    include: {
      items: {
        include: { productVariant: { include: { product: { select: { name: true } } } } },
      },
    },
  })
  if (!list) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 })
  return NextResponse.json(list)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  if ("itemId" in parsed.data) {
    const item = await prisma.purchaseListItem.update({
      where: { id: parsed.data.itemId, purchaseListId: Number(id) },
      data: { isPurchased: parsed.data.isPurchased },
    })
    return NextResponse.json(item)
  }

  const list = await prisma.purchaseList.update({
    where: { id: Number(id) },
    data: { status: parsed.data.status },
  })
  return NextResponse.json(list)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  await prisma.purchaseList.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}
