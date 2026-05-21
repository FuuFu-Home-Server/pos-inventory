import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createCustomerSchema } from "@/lib/validations/customer"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get("page") ?? 1))
  const limit = Math.min(100, Number(searchParams.get("limit") ?? 20))
  const q = searchParams.get("q") ?? ""

  const where = q
    ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { phone: { contains: q } }] }
    : undefined

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ])

  return NextResponse.json({ customers, total, page, limit })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = createCustomerSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const customer = await prisma.customer.create({ data: parsed.data })
  return NextResponse.json(customer, { status: 201 })
}
