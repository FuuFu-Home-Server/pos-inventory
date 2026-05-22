import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const meta = await prisma.syncMeta.findUnique({ where: { storeName: "catalog" } })
  return NextResponse.json({ lastSyncAt: meta?.lastSyncAt?.toISOString() ?? null })
}
