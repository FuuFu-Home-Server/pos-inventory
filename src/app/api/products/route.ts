import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createProductSchema } from "@/lib/validations/product"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get("page") ?? 1))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)))
  const q = searchParams.get("q") ?? ""
  const category = searchParams.get("category") ?? ""
  const supplierId = searchParams.get("supplierId") ?? ""
  const stockStatus = searchParams.get("stockStatus") ?? "all"
  const dataStatus = searchParams.get("dataStatus") ?? "all"
  const sortBy = searchParams.get("sortBy") ?? "name"
  const sortDir = searchParams.get("sortDir") ?? "asc"

  const allowedSort = ["name", "category", "createdAt"] as const
  type SortField = (typeof allowedSort)[number]
  const safeSortBy: SortField = allowedSort.includes(sortBy as SortField)
    ? (sortBy as SortField)
    : "name"
  const safeSortDir = sortDir === "desc" ? "desc" : "asc"

  let stockFilterIds: number[] | undefined
  if (stockStatus === "low") {
    const rows = await prisma.$queryRaw<Array<{ productId: number }>>`
      SELECT DISTINCT "productId" FROM "ProductVariant"
      WHERE "isActive" = true AND stock <= "lowStockThreshold" AND stock > 0
    `
    stockFilterIds = rows.map((r) => r.productId)
  } else if (stockStatus === "out") {
    const rows = await prisma.$queryRaw<Array<{ productId: number }>>`
      SELECT DISTINCT "productId" FROM "ProductVariant"
      WHERE "isActive" = true AND stock = 0
    `
    stockFilterIds = rows.map((r) => r.productId)
  }

  const where = {
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    ...(category ? { category } : {}),
    ...(supplierId ? { supplierId: Number(supplierId) } : {}),
    ...(stockFilterIds !== undefined ? { id: { in: stockFilterIds } } : {}),
    ...(dataStatus === "incomplete"
      ? {
          OR: [{ category: "" }, { variants: { some: { isActive: true, price: 0 } } }],
        }
      : {}),
  }

  const [products, total, activeVariants, lowStockRaw, incompleteCount] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { variants: true, supplier: { select: { id: true, name: true } } },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [safeSortBy]: safeSortDir },
    }),
    prisma.product.count({ where }),
    prisma.productVariant.count({ where: { isActive: true } }),
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count FROM "ProductVariant"
      WHERE "isActive" = true AND stock <= "lowStockThreshold"
    `,
    prisma.product.count({
      where: {
        OR: [{ category: "" }, { variants: { some: { isActive: true, price: 0 } } }],
      },
    }),
  ])

  return NextResponse.json({
    products,
    total,
    page,
    limit,
    stats: {
      activeVariants,
      lowStockCount: Number(lowStockRaw[0].count),
      incompleteCount,
    },
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = createProductSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { variants, ...productData } = parsed.data
  const product = await prisma.product.create({
    data: { ...productData, variants: { create: variants } },
    include: { variants: true },
  })

  return NextResponse.json(product, { status: 201 })
}
