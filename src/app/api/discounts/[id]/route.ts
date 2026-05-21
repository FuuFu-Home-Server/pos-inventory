import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { updateDiscountSchema } from "@/lib/validations/discount"

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const parsed = updateDiscountSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const discount = await prisma.discount.update({
    where: { id: Number(id) },
    data: parsed.data as never,
  })
  return NextResponse.json(discount)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  await prisma.discount.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}
