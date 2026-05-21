import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createPurchaseOrderSchema } from "@/lib/validations/purchase-order"
import { buildPoTotals } from "@/lib/purchase-order-service"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get("page") ?? 1))
  const limit = Math.min(100, Number(searchParams.get("limit") ?? 20))

  const [orders, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      include: {
        supplier: { select: { name: true } },
        user: { select: { name: true } },
        _count: { select: { items: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.purchaseOrder.count(),
  ])

  return NextResponse.json({ orders, total, page })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createPurchaseOrderSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { supplierId, notes, items } = parsed.data
  const { itemsWithSubtotal } = buildPoTotals(items)

  const order = await prisma.purchaseOrder.create({
    data: {
      supplierId,
      userId: Number(session.user.id),
      notes,
      status: "DRAFT",
      items: {
        create: itemsWithSubtotal.map((i) => ({
          productVariantId: i.productVariantId,
          qty: i.qty,
          unitCost: i.unitCost,
          subtotal: i.subtotal,
        })),
      },
    },
    include: {
      supplier: { select: { name: true } },
      items: { include: { productVariant: { include: { product: { select: { name: true } } } } } },
    },
  })

  return NextResponse.json(order, { status: 201 })
}
