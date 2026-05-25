import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-sync-secret")
  if (!secret || secret !== process.env.SYNC_SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await prisma.$transaction([
    prisma.productVariant.deleteMany(),
    prisma.product.deleteMany(),
    prisma.discount.deleteMany(),
    prisma.paymentMethod.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.syncMeta.deleteMany(),
  ])

  return NextResponse.json({ ok: true })
}
