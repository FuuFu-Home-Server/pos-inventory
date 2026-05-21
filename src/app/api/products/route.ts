import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createProductSchema } from "@/lib/validations/product"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get("page") ?? 1))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)))
  const q = searchParams.get("q") ?? ""
  const where = q ? { name: { contains: q, mode: "insensitive" as const } } : undefined

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { variants: true, supplier: { select: { id: true, name: true } } },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { name: "asc" },
    }),
    prisma.product.count({ where }),
  ])

  return NextResponse.json({ products, total, page, limit })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = createProductSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { variants, ...productData } = parsed.data
  const product = await prisma.product.create({
    data: { ...productData, variants: { create: variants } },
    include: { variants: true },
  })

  return NextResponse.json(product, { status: 201 })
}
