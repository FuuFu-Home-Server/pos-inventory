import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const opnames = await prisma.stockOpname.findMany({
    include: {
      user: { select: { name: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  })
  return NextResponse.json({ opnames })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const notes: string | undefined = body.notes

  const variants = await prisma.productVariant.findMany({
    select: { id: true, stock: true },
    orderBy: { id: "asc" },
  })

  const opname = await prisma.stockOpname.create({
    data: {
      userId: Number(session.user.id),
      notes,
      status: "DRAFT",
      items: {
        create: variants.map((v) => ({
          productVariantId: v.id,
          systemQty: v.stock,
          physicalQty: v.stock,
          difference: 0,
        })),
      },
    },
    include: { _count: { select: { items: true } } },
  })

  return NextResponse.json(opname, { status: 201 })
}
