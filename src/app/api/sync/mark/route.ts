import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const markSchema = z.object({
  synced: z.array(z.string()),
  failed: z.array(z.object({ localId: z.string(), reason: z.string() })),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = markSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { synced, failed } = parsed.data

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
  ]

  if (ops.length > 0) await prisma.$transaction(ops)
  return NextResponse.json({ ok: true })
}
