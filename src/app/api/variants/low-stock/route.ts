import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const variants = await prisma.$queryRaw<
    {
      id: number
      variantName: string
      unit: string
      stock: number
      lowStockThreshold: number
      costPrice: number | null
      productName: string
    }[]
  >`
    SELECT pv.id, pv."variantName", pv.unit, pv.stock, pv."lowStockThreshold",
           pv."costPrice", p.name AS "productName"
    FROM "ProductVariant" pv
    JOIN "Product" p ON p.id = pv."productId"
    WHERE pv."isActive" = true AND pv.stock <= pv."lowStockThreshold"
    ORDER BY (pv.stock - pv."lowStockThreshold") ASC
    LIMIT 50
  `
  return NextResponse.json(
    variants.map((v) => ({
      id: Number(v.id),
      variantName: v.variantName,
      unit: v.unit,
      stock: Number(v.stock),
      lowStockThreshold: Number(v.lowStockThreshold),
      costPrice: v.costPrice != null ? Number(v.costPrice) : null,
      product: { name: v.productName },
    })),
  )
}
