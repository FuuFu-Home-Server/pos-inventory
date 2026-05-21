import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({ name: z.string().min(1) })

export async function GET() {
  const [categories, productGroups] = await Promise.all([
    prisma.categoryOption.findMany({ orderBy: { name: "asc" } }),
    prisma.product.groupBy({ by: ["category"], _count: { id: true } }),
  ])
  const countMap = new Map(productGroups.map((g) => [g.category, g._count.id]))
  return NextResponse.json(
    categories.map((c) => ({ ...c, productCount: countMap.get(c.name) ?? 0 })),
  )
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const category = await prisma.categoryOption.create({ data: { name: parsed.data.name } })
  return NextResponse.json({ ...category, productCount: 0 }, { status: 201 })
}
