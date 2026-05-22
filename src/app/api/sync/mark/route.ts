import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const {
    synced,
    failed,
  }: {
    synced: string[]
    failed: { localId: string; reason: string }[]
  } = await req.json()

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
