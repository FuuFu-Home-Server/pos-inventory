import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q") ?? ""

  const variants = await prisma.productVariant.findMany({
    where: {
      isActive: true,
      stock: { gt: 0 },
      ...(q.length >= 2 ? {
        OR: [
          { product: { name: { contains: q, mode: "insensitive" } } },
          { variantName: { contains: q, mode: "insensitive" } },
          { barcode: { contains: q } },
        ],
      } : {}),
    },
    include: { product: { select: { id: true, name: true } } },
    take: 12,
    orderBy: [{ product: { name: "asc" } }, { variantName: "asc" }],
  })

  return NextResponse.json(
    variants.map((v) => ({
      id: v.id,
      productId: v.productId,
      productName: v.product.name,
      variantName: v.variantName,
      price: Number(v.price),
      stock: v.stock,
      unit: v.unit,
      barcode: v.barcode,
    }))
  )
}
