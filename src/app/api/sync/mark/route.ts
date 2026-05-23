import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const markSchema = z.object({
  synced: z.array(z.string()).default([]),
  failed: z.array(z.object({ localId: z.string(), reason: z.string() })).default([]),
  syncedPo: z.array(z.string()).default([]),
  failedPo: z.array(z.object({ localId: z.string(), reason: z.string() })).default([]),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = markSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { synced, failed, syncedPo, failedPo } = parsed.data

  const ops = [
    ...(synced.length > 0
      ? [
          prisma.transaction.updateMany({
            where: { localId: { in: synced } },
            data: { syncStatus: "SYNCED" },
          }),
        ]
      : []),
    ...failed.map((f) =>
      prisma.transaction.updateMany({
        where: { localId: f.localId },
        data: { syncStatus: "FAILED", syncFailReason: f.reason },
      }),
    ),
    ...(syncedPo.length > 0
      ? [
          prisma.purchaseOrder.updateMany({
            where: { localId: { in: syncedPo } },
            data: { syncStatus: "SYNCED" },
          }),
        ]
      : []),
    ...failedPo.map((f) =>
      prisma.purchaseOrder.updateMany({
        where: { localId: f.localId },
        data: { syncStatus: "FAILED" },
      }),
    ),
  ]

  if (ops.length > 0) await prisma.$transaction(ops)
  return NextResponse.json({ ok: true })
}
