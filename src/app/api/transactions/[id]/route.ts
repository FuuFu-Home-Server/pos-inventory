import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const transaction = await prisma.transaction.findUnique({
    where: { id: Number(id) },
    include: {
      items: {
        include: {
          productVariant: { include: { product: { select: { name: true } } } },
        },
      },
      paymentMethod: true,
      customer: true,
      user: { select: { name: true } },
      discount: true,
    },
  })
  if (!transaction) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 })
  return NextResponse.json(transaction)
}

const patchSchema = z.object({ syncStatus: z.literal("DISMISSED") })

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Unsupported" }, { status: 400 })

  await prisma.transaction.update({
    where: { id: Number(id) },
    data: { syncStatus: "DISMISSED" },
  })
  return NextResponse.json({ ok: true })
}
