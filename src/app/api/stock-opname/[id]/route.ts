import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params
  const url = new URL(req.url)
  const q = url.searchParams.get("q") ?? ""
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1))
  const limit = Math.min(200, Math.max(10, Number(url.searchParams.get("limit") ?? 100)))

  const opname = await prisma.stockOpname.findUnique({
    where: { id: Number(id) },
    select: {
      id: true,
      status: true,
      notes: true,
      createdAt: true,
      user: { select: { name: true } },
    },
  })
  if (!opname) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 })

  const where = {
    opnameId: Number(id),
    ...(q
      ? {
          productVariant: {
            OR: [
              { product: { name: { contains: q, mode: "insensitive" as const } } },
              { variantName: { contains: q, mode: "insensitive" as const } },
            ],
          },
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.stockOpnameItem.findMany({
      where,
      include: { productVariant: { include: { product: { select: { name: true } } } } },
      orderBy: { productVariant: { product: { name: "asc" } } },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.stockOpnameItem.count({ where }),
  ])

  return NextResponse.json({ ...opname, items, total, page, limit })
}

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("batch-update"),
    items: z.array(
      z.object({ itemId: z.number().int().positive(), physicalQty: z.number().int().min(0) }),
    ),
  }),
  z.object({
    action: z.literal("set-all"),
    qty: z.number().int().min(0),
    q: z.string().optional(),
  }),
  z.object({
    action: z.literal("match-paste"),
    lines: z.array(z.object({ name: z.string(), qty: z.number().int().min(0) })),
  }),
  z.object({ action: z.literal("confirm") }),
])

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const opnameId = Number(id)
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const opname = await prisma.stockOpname.findUnique({ where: { id: opnameId } })
  if (!opname) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 })
  if (opname.status !== "DRAFT")
    return NextResponse.json({ error: "Opname sudah dikonfirmasi" }, { status: 409 })

  if (parsed.data.action === "batch-update") {
    if (parsed.data.items.length === 0) return NextResponse.json({ ok: true })
    const rows = await prisma.stockOpnameItem.findMany({
      where: { id: { in: parsed.data.items.map((i) => i.itemId) }, opnameId },
      select: { id: true, systemQty: true },
    })
    const sysMap = Object.fromEntries(rows.map((r) => [r.id, r.systemQty]))
    const vals = parsed.data.items
      .map(
        ({ itemId, physicalQty }) =>
          `(${itemId}, ${physicalQty}, ${physicalQty - (sysMap[itemId] ?? 0)})`,
      )
      .join(", ")
    await prisma.$executeRawUnsafe(`
      UPDATE "StockOpnameItem" AS s
      SET "physicalQty" = v.physical, difference = v.diff
      FROM (VALUES ${vals}) AS v(id, physical, diff)
      WHERE s.id = v.id AND s."opnameId" = ${opnameId}
    `)
    return NextResponse.json({ ok: true })
  }

  if (parsed.data.action === "set-all") {
    const { qty, q } = parsed.data
    if (q) {
      await prisma.$executeRawUnsafe(`
        UPDATE "StockOpnameItem" s
        SET "physicalQty" = ${qty}, difference = ${qty} - s."systemQty"
        FROM "ProductVariant" pv
        JOIN "Product" p ON p.id = pv."productId"
        WHERE s."productVariantId" = pv.id
          AND s."opnameId" = ${opnameId}
          AND (p.name ILIKE ${`%${q}%`} OR pv."variantName" ILIKE ${`%${q}%`})
      `)
    } else {
      await prisma.$executeRawUnsafe(`
        UPDATE "StockOpnameItem"
        SET "physicalQty" = ${qty}, difference = ${qty} - "systemQty"
        WHERE "opnameId" = ${opnameId}
      `)
    }
    return NextResponse.json({ ok: true })
  }

  if (parsed.data.action === "match-paste") {
    const allItems = await prisma.stockOpnameItem.findMany({
      where: { opnameId },
      select: {
        id: true,
        systemQty: true,
        productVariant: {
          select: { variantName: true, unit: true, product: { select: { name: true } } },
        },
      },
    })
    const matched: {
      itemId: number
      qty: number
      productName: string
      variantName: string
      unit: string
    }[] = []
    const unmatched: string[] = []
    const usedIds = new Set<number>()

    for (const { name, qty } of parsed.data.lines) {
      const q = name.toLowerCase()
      const find = (fn: (i: (typeof allItems)[number]) => boolean) =>
        allItems.find((i) => fn(i) && !usedIds.has(i.id))

      const item =
        find((i) => i.productVariant.product.name.toLowerCase() === q) ??
        find(
          (i) =>
            `${i.productVariant.product.name} ${i.productVariant.variantName}`.toLowerCase() === q,
        ) ??
        find((i) => i.productVariant.product.name.toLowerCase().startsWith(q)) ??
        find((i) => i.productVariant.product.name.toLowerCase().includes(q))

      if (item) {
        usedIds.add(item.id)
        matched.push({
          itemId: item.id,
          qty,
          productName: item.productVariant.product.name,
          variantName: item.productVariant.variantName,
          unit: item.productVariant.unit,
        })
      } else {
        unmatched.push(name)
      }
    }
    return NextResponse.json({ matched, unmatched })
  }

  // confirm
  const items = await prisma.stockOpnameItem.findMany({
    where: { opnameId },
    select: { productVariantId: true, physicalQty: true },
  })
  if (items.length === 0) return NextResponse.json({ error: "Tidak ada item" }, { status: 400 })

  const vals = items.map((i) => `(${i.productVariantId}, ${i.physicalQty})`).join(", ")
  await prisma.$transaction([
    prisma.$executeRawUnsafe(`
      UPDATE "ProductVariant" AS pv SET stock = v.stock
      FROM (VALUES ${vals}) AS v(id, stock)
      WHERE pv.id = v.id
    `),
    prisma.stockOpname.update({ where: { id: opnameId }, data: { status: "CONFIRMED" } }),
  ])
  return NextResponse.json({ ok: true })
}
