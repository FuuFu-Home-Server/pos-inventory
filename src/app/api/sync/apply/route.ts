import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const variantSchema = z.object({
  id: z.number().int(),
  productId: z.number().int(),
  product: z.object({ name: z.string(), category: z.string() }),
  variantName: z.string(),
  barcode: z.string().nullable(),
  price: z.union([z.string(), z.number()]),
  costPrice: z.union([z.string(), z.number()]).nullable(),
  stock: z.number().int(),
  lowStockThreshold: z.number().int(),
  unit: z.string(),
  isActive: z.boolean(),
})

const applySchema = z.object({
  variants: z.array(variantSchema).default([]),
  paymentMethods: z
    .array(z.object({ id: z.number().int(), name: z.string(), isActive: z.boolean() }))
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
      }),
    )
    .default([]),
  receiptConfig: z.record(z.unknown()).optional(),
  syncedAt: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = applySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { variants, paymentMethods, discounts, customers, suppliers, receiptConfig, syncedAt } =
    parsed.data

  await prisma.$transaction(async (db) => {
    for (const v of variants) {
      await db.product.upsert({
        where: { id: v.productId },
        create: { id: v.productId, name: v.product.name, category: v.product.category },
        update: { name: v.product.name, category: v.product.category },
      })
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

    for (const pm of paymentMethods) {
      await db.paymentMethod.upsert({
        where: { id: pm.id },
        create: { id: pm.id, name: pm.name, isActive: pm.isActive },
        update: { name: pm.name, isActive: pm.isActive },
      })
    }

    for (const d of discounts) {
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

    for (const c of customers) {
      await db.customer.upsert({
        where: { id: c.id },
        create: { id: c.id, name: c.name, phone: c.phone ?? null, address: c.address ?? null },
        update: { name: c.name, phone: c.phone ?? null, address: c.address ?? null },
      })
    }

    for (const s of suppliers) {
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

    if (receiptConfig) {
      const { id: _rc_id, updatedAt: _rc_updatedAt, ...rest } = receiptConfig
      await db.receiptConfig.upsert({
        where: { id: 1 },
        create: { id: 1, ...rest },
        update: rest,
      })
    }

    if (syncedAt) {
      await db.syncMeta.upsert({
        where: { storeName: "catalog" },
        create: { storeName: "catalog", lastSyncAt: new Date(syncedAt) },
        update: { lastSyncAt: new Date(syncedAt) },
      })
    }
  })

  return NextResponse.json({ ok: true })
}
