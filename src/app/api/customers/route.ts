import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createCustomerSchema } from "@/lib/validations/customer"

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q") ?? ""
  const customers = await prisma.customer.findMany({
    where: q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] }
      : undefined,
    orderBy: { name: "asc" },
  })
  return NextResponse.json({ customers })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = createCustomerSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const customer = await prisma.customer.create({ data: parsed.data })
  return NextResponse.json(customer, { status: 201 })
}
