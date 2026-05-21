import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const configSchema = z.object({
  storeName: z.string().min(1),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  headerText: z.string().optional().nullable(),
  footerText: z.string().optional().nullable(),
  showTax: z.boolean(),
  showCashier: z.boolean(),
  paperWidth: z.number().int().refine((v) => v === 58 || v === 80, "Harus 58 atau 80"),
})

export async function GET() {
  const config = await prisma.receiptConfig.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, storeName: "Toko Saya", showTax: false, showCashier: true, paperWidth: 80 },
  })
  return NextResponse.json(config)
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const parsed = configSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const config = await prisma.receiptConfig.upsert({
    where: { id: 1 },
    update: parsed.data,
    create: { id: 1, ...parsed.data },
  })
  return NextResponse.json(config)
}
