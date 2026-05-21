import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const scanSchema = z.object({ barcode: z.string().min(1) })

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = scanSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Barcode tidak valid" }, { status: 400 })

  const variant = await prisma.productVariant.findUnique({
    where: { barcode: parsed.data.barcode, isActive: true },
    include: { product: { select: { id: true, name: true } } },
  })

  if (!variant) return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 })
  if (variant.stock <= 0) return NextResponse.json({ error: `Stok ${variant.product.name} ${variant.variantName} habis` }, { status: 409 })

  return NextResponse.json({
    id: variant.id,
    productId: variant.productId,
    productName: variant.product.name,
    variantName: variant.variantName,
    price: Number(variant.price),
    stock: variant.stock,
    unit: variant.unit,
    barcode: variant.barcode,
  })
}
