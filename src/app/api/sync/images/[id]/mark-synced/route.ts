import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(_req: NextRequest, { params }: Params) {
  const { id } = await params
  await prisma.purchaseListImage.update({
    where: { id: Number(id) },
    data: { syncStatus: "SYNCED" },
  })
  return NextResponse.json({ ok: true })
}
