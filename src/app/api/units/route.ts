import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const schema = z.object({ name: z.string().min(1) })

export async function GET(req: NextRequest) {
  const active = new URL(req.url).searchParams.get("active")
  const units = await prisma.unitOption.findMany({
    where: active === "true" ? { isActive: true } : undefined,
    orderBy: { name: "asc" },
  })
  return NextResponse.json(units)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const unit = await prisma.unitOption.create({
    data: { name: parsed.data.name },
  })
  return NextResponse.json(unit, { status: 201 })
}
