import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const config = await prisma.receiptConfig.findUnique({ where: { id: 1 } })
  if (!config) return NextResponse.json({ error: "Receipt config not found" }, { status: 404 })
  return NextResponse.json(config)
}
