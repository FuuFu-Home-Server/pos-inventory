import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { updateCustomerSchema } from "@/lib/validations/customer"

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const parsed = updateCustomerSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const customer = await prisma.customer.update({ where: { id: Number(id) }, data: parsed.data })
  return NextResponse.json(customer)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  await prisma.customer.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}
