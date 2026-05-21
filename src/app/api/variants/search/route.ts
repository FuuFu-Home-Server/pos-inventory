import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q") ?? ""
  if (q.length < 2) return NextResponse.json([])

  const variants = await prisma.productVariant.findMany({
    where: {
      stock: { gt: 0 },
      OR: [
        { product: { name: { contains: q, mode: "insensitive" } } },
        { variantName: { contains: q, mode: "insensitive" } },
        { barcode: { contains: q } },
      ],
    },
    include: { product: { select: { id: true, name: true } } },
    take: 10,
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
