import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const {
    variants = [],
    paymentMethods = [],
    discounts = [],
    customers = [],
    receiptConfig,
    syncedAt,
  } = await req.json()

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

    if (receiptConfig) {
      const { id: _id, updatedAt: _updatedAt, ...rest } = receiptConfig
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
