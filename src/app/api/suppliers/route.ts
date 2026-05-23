import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createSupplierSchema } from "@/lib/validations/supplier"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get("page") ?? 1))
  const limit = Math.min(100, Number(searchParams.get("limit") ?? 50))
  const q = searchParams.get("q") ?? ""

  const where = q ? { name: { contains: q } } : undefined

  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { name: "asc" },
    }),
    prisma.supplier.count({ where }),
  ])

  return NextResponse.json({ suppliers, total, page, limit })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = createSupplierSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const supplier = await prisma.supplier.create({ data: parsed.data })
  return NextResponse.json(supplier, { status: 201 })
}
