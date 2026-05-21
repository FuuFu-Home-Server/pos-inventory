import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { updateVariantSchema } from "@/lib/validations/product"

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const parsed = updateVariantSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const variant = await prisma.productVariant.update({
    where: { id: Number(id) },
    data: parsed.data,
  })
  return NextResponse.json(variant)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  await prisma.productVariant.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}
