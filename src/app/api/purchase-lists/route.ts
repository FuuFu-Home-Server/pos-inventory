import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const itemSchema = z.object({
  productVariantId: z.number().int().positive().optional().nullable(),
  productName: z.string().min(1),
  variantName: z.string(),
  unit: z.string().min(1),
  qtyPerUnit: z.number().int().min(1).default(1),
  qty: z.number().int().min(1),
  unitCost: z.number().min(0),
})

const createSchema = z.object({
  title: z.string().min(1),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1),
})

export async function GET() {
  const lists = await prisma.purchaseList.findMany({
    include: {
      _count: { select: { items: true } },
      items: { select: { isPurchased: true, unitCost: true, qty: true } },
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(lists.map((l) => ({
    ...l,
    totalCost: l.items.reduce((s, i) => s + Number(i.unitCost) * i.qty, 0),
    purchasedCount: l.items.filter((i) => i.isPurchased).length,
  })))
}

export async function POST(req: NextRequest) {
  await auth()
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const list = await prisma.purchaseList.create({
    data: {
      title: parsed.data.title,
      notes: parsed.data.notes,
      items: {
        create: parsed.data.items.map((i) => ({
          productVariantId: i.productVariantId ?? null,
          productName: i.productName,
          variantName: i.variantName,
          unit: i.unit,
          qtyPerUnit: i.qtyPerUnit,
          qty: i.qty,
          unitCost: i.unitCost,
        })),
      },
    },
    include: { items: true },
  })
  return NextResponse.json(list, { status: 201 })
}
