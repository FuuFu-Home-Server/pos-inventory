import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export async function GET() {
  const [catalog, push] = await Promise.all([
    prisma.syncMeta.findUnique({ where: { storeName: "catalog" } }),
    prisma.syncMeta.findUnique({ where: { storeName: "catalog-push" } }),
  ])
  return NextResponse.json({
    lastSyncAt: catalog?.lastSyncAt?.toISOString() ?? null,
    lastPushAt: push?.lastSyncAt?.toISOString() ?? null,
  })
}

const postSchema = z.object({
  storeName: z.string(),
  syncedAt: z.string(),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  await prisma.syncMeta.upsert({
    where: { storeName: parsed.data.storeName },
    create: { storeName: parsed.data.storeName, lastSyncAt: new Date(parsed.data.syncedAt) },
    update: { lastSyncAt: new Date(parsed.data.syncedAt) },
  })

  return NextResponse.json({ ok: true })
}
