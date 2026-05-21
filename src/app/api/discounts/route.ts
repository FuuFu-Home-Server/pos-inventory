import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createDiscountSchema } from "@/lib/validations/discount"

export async function GET(req: NextRequest) {
  const active = new URL(req.url).searchParams.get("active")
  const now = new Date()

  const where = active === "true" ? {
    isActive: true,
    OR: [{ validUntil: null }, { validUntil: { gte: now } }],
  } : undefined

  const discounts = await prisma.discount.findMany({
    where,
    include: { product: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ discounts })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = createDiscountSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const discount = await prisma.discount.create({ data: parsed.data as any })
  return NextResponse.json(discount, { status: 201 })
}
