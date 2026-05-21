import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params
  const activeOnly = req.nextUrl.searchParams.get("activeOnly") === "true"

  const variants = await prisma.productVariant.findMany({
    where: {
      productId: Number(id),
      ...(activeOnly ? { isActive: true } : {}),
    },
    orderBy: { variantName: "asc" },
    select: { id: true, variantName: true, price: true, stock: true, unit: true, barcode: true, isActive: true },
  })

  return NextResponse.json(variants)
}
