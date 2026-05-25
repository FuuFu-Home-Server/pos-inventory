import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const pushSchema = z.object({
  products: z
    .array(
      z.object({
        id: z.number().int(),
        name: z.string(),
        category: z.string(),
        supplierId: z.number().int().nullable(),
        updatedAt: z.string(),
      }),
    )
    .default([]),
  variants: z
    .array(
      z.object({
        id: z.number().int(),
        productId: z.number().int(),
        variantName: z.string(),
        barcode: z.string().nullable(),
        price: z.union([z.string(), z.number()]),
        costPrice: z.union([z.string(), z.number()]).nullable(),
        stock: z.number().int(),
        lowStockThreshold: z.number().int(),
        unit: z.string(),
        isActive: z.boolean(),
        updatedAt: z.string(),
      }),
    )
    .default([]),
  paymentMethods: z
    .array(
      z.object({
        id: z.number().int(),
        name: z.string(),
        isActive: z.boolean(),
        updatedAt: z.string(),
      }),
    )
    .default([]),
  discounts: z
    .array(
      z.object({
        id: z.number().int(),
        name: z.string(),
        type: z.string(),
        value: z.union([z.string(), z.number()]),
        scope: z.string(),
        productId: z.number().int().nullable(),
        minPurchase: z.union([z.string(), z.number()]).nullable(),
        isActive: z.boolean(),
        updatedAt: z.string(),
      }),
    )
    .default([]),
  customers: z
    .array(
      z.object({
        id: z.number().int(),
        name: z.string(),
        phone: z.string().nullable(),
        address: z.string().nullable(),
        updatedAt: z.string(),
      }),
    )
    .default([]),
  suppliers: z
    .array(
      z.object({
        id: z.number().int(),
        name: z.string(),
        phone: z.string().nullable(),
        address: z.string().nullable(),
        contactPerson: z.string().nullable(),
        updatedAt: z.string(),
      }),
    )
    .default([]),
})

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-sync-secret")
  if (!secret || secret !== process.env.SYNC_SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = pushSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { products, variants, paymentMethods, discounts, customers, suppliers } = parsed.data

  await prisma.$transaction(async (db) => {
    for (const p of products) {
      const existing = await db.product.findUnique({
        where: { id: p.id },
        select: { updatedAt: true },
      })
      if (!existing || new Date(p.updatedAt) >= existing.updatedAt) {
        await db.product.upsert({
          where: { id: p.id },
          create: { id: p.id, name: p.name, category: p.category, supplierId: p.supplierId },
          update: { name: p.name, category: p.category, supplierId: p.supplierId },
        })
      }
    }

    for (const v of variants) {
      const existing = await db.productVariant.findUnique({
        where: { id: v.id },
        select: { updatedAt: true },
      })
      if (!existing || new Date(v.updatedAt) >= existing.updatedAt) {
        await db.productVariant.upsert({
          where: { id: v.id },
          create: {
            id: v.id,
            productId: v.productId,
            variantName: v.variantName,
            barcode: v.barcode,
            price: v.price,
            costPrice: v.costPrice ?? null,
            stock: v.stock,
            lowStockThreshold: v.lowStockThreshold,
            unit: v.unit,
            isActive: v.isActive,
          },
          update: {
            variantName: v.variantName,
            barcode: v.barcode,
            price: v.price,
            costPrice: v.costPrice ?? null,
            stock: v.stock,
            lowStockThreshold: v.lowStockThreshold,
            unit: v.unit,
            isActive: v.isActive,
          },
        })
      }
    }

    for (const pm of paymentMethods) {
      const existing = await db.paymentMethod.findUnique({
        where: { id: pm.id },
        select: { updatedAt: true },
      })
      if (!existing || new Date(pm.updatedAt) >= existing.updatedAt) {
        await db.paymentMethod.upsert({
          where: { id: pm.id },
          create: { id: pm.id, name: pm.name, isActive: pm.isActive },
          update: { name: pm.name, isActive: pm.isActive },
        })
      }
    }

    for (const d of discounts) {
      const existing = await db.discount.findUnique({
        where: { id: d.id },
        select: { updatedAt: true },
      })
      if (!existing || new Date(d.updatedAt) >= existing.updatedAt) {
        await db.discount.upsert({
          where: { id: d.id },
          create: {
            id: d.id,
            name: d.name,
            type: d.type,
            value: d.value,
            scope: d.scope,
            productId: d.productId ?? null,
            minPurchase: d.minPurchase ?? null,
            isActive: d.isActive,
          },
          update: {
            name: d.name,
            type: d.type,
            value: d.value,
            scope: d.scope,
            productId: d.productId ?? null,
            minPurchase: d.minPurchase ?? null,
            isActive: d.isActive,
          },
        })
      }
    }

    for (const c of customers) {
      const existing = await db.customer.findUnique({
        where: { id: c.id },
        select: { updatedAt: true },
      })
      if (!existing || new Date(c.updatedAt) >= existing.updatedAt) {
        await db.customer.upsert({
          where: { id: c.id },
          create: { id: c.id, name: c.name, phone: c.phone ?? null, address: c.address ?? null },
          update: { name: c.name, phone: c.phone ?? null, address: c.address ?? null },
        })
      }
    }

    for (const s of suppliers) {
      const existing = await db.supplier.findUnique({
        where: { id: s.id },
        select: { updatedAt: true },
      })
      if (!existing || new Date(s.updatedAt) >= existing.updatedAt) {
        await db.supplier.upsert({
          where: { id: s.id },
          create: {
            id: s.id,
            name: s.name,
            phone: s.phone ?? null,
            address: s.address ?? null,
            contactPerson: s.contactPerson ?? null,
          },
          update: {
            name: s.name,
            phone: s.phone ?? null,
            address: s.address ?? null,
            contactPerson: s.contactPerson ?? null,
          },
        })
      }
    }
  })

  return NextResponse.json({ ok: true })
}
