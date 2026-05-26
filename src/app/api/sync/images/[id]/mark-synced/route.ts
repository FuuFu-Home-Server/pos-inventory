import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(_req: NextRequest, { params }: Params) {
  const { id } = await params
  try {
    await prisma.purchaseListImage.update({
      where: { id: Number(id) },
      data: { syncStatus: "SYNCED" },
    })
  } catch {
    // Record may not exist (already deleted) — not fatal
  }
  return NextResponse.json({ ok: true })
}
