import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const opname = await prisma.stockOpname.findUnique({
    where: { id: Number(id) },
    include: {
      user: { select: { name: true } },
      items: {
        include: { productVariant: { include: { product: { select: { name: true } } } } },
        orderBy: { productVariant: { product: { name: "asc" } } },
      },
    },
  })
  if (!opname) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 })
  return NextResponse.json(opname)
}

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("update-item"), itemId: z.number().int().positive(), physicalQty: z.number().int().min(0) }),
  z.object({ action: z.literal("confirm") }),
])

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const opname = await prisma.stockOpname.findUnique({ where: { id: Number(id) }, include: { items: true } })
  if (!opname) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 })
  if (opname.status !== "DRAFT") return NextResponse.json({ error: "Opname sudah dikonfirmasi" }, { status: 409 })

  if (parsed.data.action === "update-item") {
    const { itemId, physicalQty } = parsed.data
    await prisma.stockOpnameItem.update({
      where: { id: itemId },
      data: { physicalQty, difference: physicalQty - (opname.items.find((i) => i.id === itemId)?.systemQty ?? 0) },
    })
    return NextResponse.json({ ok: true })
  }

  await prisma.$transaction(async (tx) => {
    await Promise.all(
      opname.items.map((item) =>
        tx.productVariant.update({
          where: { id: item.productVariantId },
          data: { stock: item.physicalQty },
        })
      )
    )
    await tx.stockOpname.update({
      where: { id: Number(id) },
      data: { status: "CONFIRMED" },
    })
  })

  return NextResponse.json({ ok: true })
}
