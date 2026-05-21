import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { updateProductSchema } from "@/lib/validations/product"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const product = await prisma.product.findUnique({
    where: { id: Number(id) },
    include: { variants: true, supplier: { select: { id: true, name: true } } },
  })
  if (!product) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 })
  return NextResponse.json(product)
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const parsed = updateProductSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const product = await prisma.product.update({
    where: { id: Number(id) },
    data: parsed.data,
    include: { variants: true },
  })
  return NextResponse.json(product)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  await prisma.product.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}
