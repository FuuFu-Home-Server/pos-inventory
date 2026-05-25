import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const since = req.nextUrl.searchParams.get("since")
  const sinceDate = since ? new Date(since) : undefined

  const where = sinceDate ? { updatedAt: { gt: sinceDate } } : {}

  const [products, variants, paymentMethods, discounts, customers, suppliers] = await Promise.all([
    prisma.product.findMany({ where }),
    prisma.productVariant.findMany({ where }),
    prisma.paymentMethod.findMany({ where }),
    prisma.discount.findMany({ where }),
    prisma.customer.findMany({ where }),
    prisma.supplier.findMany({ where }),
  ])

  return NextResponse.json({
    products,
    variants,
    paymentMethods,
    discounts,
    customers,
    suppliers,
    exportedAt: new Date().toISOString(),
  })
}
