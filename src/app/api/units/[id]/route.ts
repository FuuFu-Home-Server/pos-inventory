import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

const patchSchema = z.object({ isActive: z.boolean() })

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const unit = await prisma.unitOption.update({
    where: { id: Number(id) },
    data: { isActive: parsed.data.isActive },
  })
  return NextResponse.json(unit)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  await prisma.unitOption.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}
