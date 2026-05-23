import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

const addVariantSchema = z.object({
  variantName: z.string().min(1),
  unit: z.string().min(1),
  price: z.number().min(0).default(0),
  costPrice: z.number().min(0).nullable().default(null),
  stock: z.number().int().default(0),
  lowStockThreshold: z.number().int().default(5),
  barcode: z.string().nullable().default(null),
})

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const productId = Number(id)
  const body = await req.json()
  const parsed = addVariantSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true },
  })
  if (!product) return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 })

  const variant = await prisma.productVariant.create({
    data: { ...parsed.data, productId, isActive: true },
  })

  return NextResponse.json(
    { ...variant, productId: product.id, productName: product.name },
    { status: 201 },
  )
}

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params
  const activeOnly = req.nextUrl.searchParams.get("activeOnly") === "true"

  const variants = await prisma.productVariant.findMany({
    where: {
      productId: Number(id),
      ...(activeOnly ? { isActive: true } : {}),
    },
    orderBy: { variantName: "asc" },
    select: {
      id: true,
      variantName: true,
      price: true,
      stock: true,
      unit: true,
      barcode: true,
      isActive: true,
    },
  })

  return NextResponse.json(variants)
}
