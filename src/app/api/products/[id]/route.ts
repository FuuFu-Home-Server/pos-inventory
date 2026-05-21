import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { updateProductSchema } from "@/lib/validations/product"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const product = await prisma.product.findUnique({
    where: { id: Number(id) },
    include: { variants: true, supplier: { select: { id: true, name: true } } },
  })
  if (!product) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 })
  return NextResponse.json(product)
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const productId = Number(id)
  const body = await req.json()
  const parsed = updateProductSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { variants, ...productFields } = parsed.data

  const product = await prisma.$transaction(async (tx) => {
    await tx.product.update({ where: { id: productId }, data: productFields })

    if (variants && variants.length > 0) {
      await Promise.all(
        variants.map((v) => {
          const { id: variantId, ...data } = v
          if (variantId) {
            return tx.productVariant.update({ where: { id: variantId }, data })
          }
          return tx.productVariant.create({ data: { ...data, productId } })
        })
      )
    }

    return tx.product.findUnique({
      where: { id: productId },
      include: { variants: true, supplier: { select: { id: true, name: true } } },
    })
  })

  return NextResponse.json(product)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  await prisma.product.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}
