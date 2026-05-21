import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  await prisma.unitOption.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}
