import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const q = url.searchParams.get("q") ?? ""
  const includeZeroStock = url.searchParams.get("includeZeroStock") === "true"

  const variants = await prisma.productVariant.findMany({
    where: {
      isActive: true,
      ...(includeZeroStock ? {} : { stock: { gt: 0 } }),
      ...(q.length >= 1
        ? {
            OR: [
              { product: { name: { contains: q } } },
              { variantName: { contains: q } },
              { barcode: { contains: q } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      productId: true,
      variantName: true,
      price: true,
      costPrice: true,
      stock: true,
      unit: true,
      barcode: true,
      product: { select: { id: true, name: true } },
    },
    take: 30,
    orderBy: [{ product: { name: "asc" } }, { variantName: "asc" }],
  })

  return NextResponse.json(
    variants.map((v) => ({
      id: v.id,
      productId: v.productId,
      productName: v.product.name,
      variantName: v.variantName,
      price: Number(v.price),
      costPrice: v.costPrice ? Number(v.costPrice) : null,
      stock: v.stock,
      unit: v.unit,
      barcode: v.barcode,
    })),
  )
}
