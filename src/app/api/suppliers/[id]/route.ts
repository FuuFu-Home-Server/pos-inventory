import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { updateSupplierSchema } from "@/lib/validations/supplier"

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const parsed = updateSupplierSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const supplier = await prisma.supplier.update({ where: { id: Number(id) }, data: parsed.data })
  return NextResponse.json(supplier)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  await prisma.supplier.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}
