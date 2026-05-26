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
  roles: z.array(z.object({ id: z.number().int(), name: z.string() })).default([]),
  categories: z
    .array(z.object({ id: z.number().int(), name: z.string(), isActive: z.boolean() }))
    .default([]),
  units: z
    .array(z.object({ id: z.number().int(), name: z.string(), isActive: z.boolean() }))
    .default([]),
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
  transactions: z
    .array(
      z.object({
        id: z.number().int(),
        userId: z.number().int(),
        customerId: z.number().int().nullable(),
        discountId: z.number().int().nullable(),
        paymentMethodId: z.number().int(),
        discountAmount: z.union([z.string(), z.number()]),
        subtotal: z.union([z.string(), z.number()]),
        total: z.union([z.string(), z.number()]),
        paymentAmount: z.union([z.string(), z.number()]),
        changeAmount: z.union([z.string(), z.number()]),
        midtransOrderId: z.string().nullable().optional(),
        status: z.string(),
        syncStatus: z.string().default("SYNCED"),
        syncFailReason: z.string().nullable().optional(),
        localId: z.string().nullable().optional(),
        createdAt: z.string(),
        items: z.array(
          z.object({
            id: z.number().int(),
            productVariantId: z.number().int(),
            qty: z.number().int(),
            unitPrice: z.union([z.string(), z.number()]),
            itemDiscountAmt: z.union([z.string(), z.number()]),
            subtotal: z.union([z.string(), z.number()]),
          }),
        ),
      }),
    )
    .default([]),
  purchaseOrders: z
    .array(
      z.object({
        id: z.number().int(),
        supplierId: z.number().int().nullable(),
        userId: z.number().int(),
        status: z.string(),
        notes: z.string().nullable().optional(),
        createdAt: z.string(),
        receivedAt: z.string().nullable().optional(),
        syncStatus: z.string().default("SYNCED"),
        localId: z.string().nullable().optional(),
        items: z.array(
          z.object({
            id: z.number().int(),
            productVariantId: z.number().int(),
            qty: z.number().int(),
            unitCost: z.union([z.string(), z.number()]),
            subtotal: z.union([z.string(), z.number()]),
          }),
        ),
      }),
    )
    .default([]),
  purchaseLists: z
    .array(
      z.object({
        id: z.number().int(),
        title: z.string(),
        notes: z.string().nullable().optional(),
        status: z.string(),
        createdAt: z.string(),
        items: z.array(
          z.object({
            id: z.number().int(),
            productVariantId: z.number().int().nullable(),
            productName: z.string(),
            variantName: z.string(),
            unit: z.string(),
            qty: z.number().int(),
            qtyPerUnit: z.number().int(),
            unitCost: z.union([z.string(), z.number()]),
            isPurchased: z.boolean(),
          }),
        ),
      }),
    )
    .default([]),
  users: z
    .array(
      z.object({
        id: z.number().int(),
        name: z.string(),
        email: z.string(),
        passwordHash: z.string(),
        roleId: z.number().int(),
        isActive: z.boolean(),
        isDefaultCredential: z.boolean(),
        createdAt: z.string(),
      }),
    )
    .default([]),
  stockOpnames: z
    .array(
      z.object({
        id: z.number().int(),
        userId: z.number().int(),
        status: z.string(),
        notes: z.string().nullable().optional(),
        createdAt: z.string(),
        items: z.array(
          z.object({
            id: z.number().int(),
            productVariantId: z.number().int(),
            systemQty: z.number().int(),
            physicalQty: z.number().int(),
            difference: z.number().int(),
          }),
        ),
      }),
    )
    .default([]),
  receiptConfig: z.record(z.unknown()).nullish(),
  syncedAt: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = applySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const {
    roles,
    categories,
    units,
    users,
    variants,
    paymentMethods,
    discounts,
    customers,
    suppliers,
    transactions,
    purchaseOrders,
    purchaseLists,
    stockOpnames,
    receiptConfig,
    syncedAt,
  } = parsed.data

  await prisma.$transaction(async (db) => {
    for (const r of roles) {
      await db.role.upsert({
        where: { name: r.name },
        create: { id: r.id, name: r.name },
        update: { name: r.name },
      })
    }

    for (const c of categories) {
      await db.categoryOption.upsert({
        where: { name: c.name },
        create: { id: c.id, name: c.name, isActive: c.isActive },
        update: { isActive: c.isActive },
      })
    }

    for (const u of units) {
      await db.unitOption.upsert({
        where: { name: u.name },
        create: { id: u.id, name: u.name, isActive: u.isActive },
        update: { isActive: u.isActive },
      })
    }

    for (const u of users) {
      await db.user.upsert({
        where: { email: u.email },
        create: {
          id: u.id,
          name: u.name,
          email: u.email,
          passwordHash: u.passwordHash,
          roleId: u.roleId,
          isActive: u.isActive,
          isDefaultCredential: u.isDefaultCredential,
          createdAt: new Date(u.createdAt),
        },
        update: {
          name: u.name,
          email: u.email,
          passwordHash: u.passwordHash,
          roleId: u.roleId,
          isActive: u.isActive,
          isDefaultCredential: u.isDefaultCredential,
        },
      })
    }

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
        where: { name: pm.name },
        create: { id: pm.id, name: pm.name, isActive: pm.isActive },
        update: { isActive: pm.isActive },
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

    for (const t of transactions) {
      await db.transaction.upsert({
        where: { id: t.id },
        create: {
          id: t.id,
          userId: t.userId,
          customerId: t.customerId ?? null,
          discountId: t.discountId ?? null,
          paymentMethodId: t.paymentMethodId,
          discountAmount: t.discountAmount,
          subtotal: t.subtotal,
          total: t.total,
          paymentAmount: t.paymentAmount,
          changeAmount: t.changeAmount,
          midtransOrderId: t.midtransOrderId ?? null,
          status: t.status,
          syncStatus: "SYNCED",
          syncFailReason: t.syncFailReason ?? null,
          localId: t.localId ?? null,
          createdAt: new Date(t.createdAt),
        },
        update: {
          status: t.status,
          syncStatus: "SYNCED",
          syncFailReason: t.syncFailReason ?? null,
        },
      })
      for (const item of t.items) {
        await db.transactionItem.upsert({
          where: { id: item.id },
          create: {
            id: item.id,
            transactionId: t.id,
            productVariantId: item.productVariantId,
            qty: item.qty,
            unitPrice: item.unitPrice,
            itemDiscountAmt: item.itemDiscountAmt,
            subtotal: item.subtotal,
          },
          update: {
            qty: item.qty,
            unitPrice: item.unitPrice,
            itemDiscountAmt: item.itemDiscountAmt,
            subtotal: item.subtotal,
          },
        })
      }
    }

    for (const po of purchaseOrders) {
      await db.purchaseOrder.upsert({
        where: { id: po.id },
        create: {
          id: po.id,
          supplierId: po.supplierId ?? null,
          userId: po.userId,
          status: po.status,
          notes: po.notes ?? null,
          createdAt: new Date(po.createdAt),
          receivedAt: po.receivedAt ? new Date(po.receivedAt) : null,
          syncStatus: "SYNCED",
          localId: po.localId ?? null,
        },
        update: {
          status: po.status,
          notes: po.notes ?? null,
          receivedAt: po.receivedAt ? new Date(po.receivedAt) : null,
          syncStatus: "SYNCED",
        },
      })
      for (const item of po.items) {
        await db.purchaseOrderItem.upsert({
          where: { id: item.id },
          create: {
            id: item.id,
            purchaseOrderId: po.id,
            productVariantId: item.productVariantId,
            qty: item.qty,
            unitCost: item.unitCost,
            subtotal: item.subtotal,
          },
          update: { qty: item.qty, unitCost: item.unitCost, subtotal: item.subtotal },
        })
      }
    }

    for (const pl of purchaseLists) {
      await db.purchaseList.upsert({
        where: { id: pl.id },
        create: {
          id: pl.id,
          title: pl.title,
          notes: pl.notes ?? null,
          status: pl.status,
          createdAt: new Date(pl.createdAt),
        },
        update: { title: pl.title, notes: pl.notes ?? null, status: pl.status },
      })
      for (const item of pl.items) {
        await db.purchaseListItem.upsert({
          where: { id: item.id },
          create: {
            id: item.id,
            purchaseListId: pl.id,
            productVariantId: item.productVariantId ?? null,
            productName: item.productName,
            variantName: item.variantName,
            unit: item.unit,
            qty: item.qty,
            qtyPerUnit: item.qtyPerUnit,
            unitCost: item.unitCost,
            isPurchased: item.isPurchased,
          },
          update: {
            productVariantId: item.productVariantId ?? null,
            productName: item.productName,
            variantName: item.variantName,
            unit: item.unit,
            qty: item.qty,
            qtyPerUnit: item.qtyPerUnit,
            unitCost: item.unitCost,
            isPurchased: item.isPurchased,
          },
        })
      }
    }

    for (const so of stockOpnames) {
      await db.stockOpname.upsert({
        where: { id: so.id },
        create: {
          id: so.id,
          userId: so.userId,
          status: so.status,
          notes: so.notes ?? null,
          createdAt: new Date(so.createdAt),
        },
        update: { status: so.status, notes: so.notes ?? null },
      })
      for (const item of so.items) {
        await db.stockOpnameItem.upsert({
          where: { id: item.id },
          create: {
            id: item.id,
            opnameId: so.id,
            productVariantId: item.productVariantId,
            systemQty: item.systemQty,
            physicalQty: item.physicalQty,
            difference: item.difference,
          },
          update: {
            systemQty: item.systemQty,
            physicalQty: item.physicalQty,
            difference: item.difference,
          },
        })
      }
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
