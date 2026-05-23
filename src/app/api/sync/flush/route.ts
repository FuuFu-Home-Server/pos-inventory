import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildTransactionTotals } from "@/lib/transaction-service"
import { z } from "zod"

const flushSchema = z.object({
  transactions: z.array(
    z.object({
      localId: z.string(),
      items: z
        .array(
          z.object({
            variantId: z.number().int().positive(),
            qty: z.number().int().positive(),
            unitPrice: z.number().min(0),
            itemDiscountAmt: z.number().min(0),
          }),
        )
        .min(1),
      customerId: z.number().int().positive().optional(),
      discountId: z.number().int().positive().optional(),
      paymentMethodId: z.number().int().positive(),
      paymentAmount: z.number().min(0),
      createdAt: z.string(),
    }),
  ),
  purchaseOrders: z
    .array(
      z.object({
        localId: z.string(),
        supplierId: z.number().int().positive().nullable(),
        supplier: z
          .object({
            id: z.number().int(),
            name: z.string(),
            phone: z.string().nullable(),
            address: z.string().nullable(),
            contactPerson: z.string().nullable(),
          })
          .nullable()
          .optional(),
        userId: z.number().int().positive(),
        status: z.string(),
        notes: z.string().nullable(),
        createdAt: z.string(),
        receivedAt: z.string().nullable(),
        items: z.array(
          z.object({
            variantId: z.number().int().positive(),
            qty: z.number().int().positive(),
            unitCost: z.number().min(0),
            subtotal: z.number().min(0),
          }),
        ),
      }),
    )
    .default([]),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = flushSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const synced: string[] = []
  const failed: { localId: string; reason: string }[] = []

  for (const tx of parsed.data.transactions) {
    const existing = await prisma.transaction.findUnique({ where: { localId: tx.localId } })
    if (existing) {
      synced.push(tx.localId)
      continue
    }

    try {
      await prisma.$transaction(async (db) => {
        const variants = await Promise.all(
          tx.items.map((item) =>
            db.productVariant.findUnique({
              where: { id: item.variantId },
              include: { product: { select: { name: true } } },
            }),
          ),
        )
        const insufficient: string[] = []
        for (let i = 0; i < variants.length; i++) {
          const v = variants[i]
          if (!v || !v.isActive)
            insufficient.push(`Produk id ${tx.items[i].variantId} tidak ditemukan`)
          else if (v.stock < tx.items[i].qty)
            insufficient.push(
              `${v.product.name} ${v.variantName}: stok ${v.stock}, butuh ${tx.items[i].qty}`,
            )
        }
        if (insufficient.length > 0)
          throw Object.assign(new Error("INSUFFICIENT"), { details: insufficient.join("; ") })

        let discountData: {
          type: "PERCENT" | "FLAT"
          value: number
          scope: "TRANSACTION" | "PRODUCT"
          minPurchase: number | null
        } | null = null
        if (tx.discountId) {
          const d = await db.discount.findUnique({ where: { id: tx.discountId, isActive: true } })
          if (d)
            discountData = {
              type: d.type as "PERCENT" | "FLAT",
              value: Number(d.value),
              scope: d.scope as "TRANSACTION" | "PRODUCT",
              minPurchase: d.minPurchase ? Number(d.minPurchase) : null,
            }
        }

        const { subtotal, discountAmount, total } = buildTransactionTotals(
          tx.items.map((i) => ({
            qty: i.qty,
            unitPrice: i.unitPrice,
            itemDiscountAmt: i.itemDiscountAmt,
          })),
          discountData,
        )
        const changeAmount = Math.max(0, tx.paymentAmount - total)

        await db.transaction.create({
          data: {
            userId: Number(session.user.id),
            customerId: tx.customerId ?? null,
            discountId: tx.discountId ?? null,
            paymentMethodId: tx.paymentMethodId,
            discountAmount,
            subtotal,
            total,
            paymentAmount: tx.paymentAmount,
            changeAmount,
            status: "COMPLETED",
            syncStatus: "SYNCED",
            localId: tx.localId,
            createdAt: new Date(tx.createdAt),
            items: {
              create: tx.items.map((item) => ({
                productVariantId: item.variantId,
                qty: item.qty,
                unitPrice: item.unitPrice,
                itemDiscountAmt: item.itemDiscountAmt,
                subtotal: item.qty * item.unitPrice - item.itemDiscountAmt,
              })),
            },
          },
        })

        await Promise.all(
          tx.items.map((item) =>
            db.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { decrement: item.qty } },
            }),
          ),
        )
      })
      synced.push(tx.localId)
    } catch (err: unknown) {
      const details = (err as { details?: string })?.details
      const msg = err instanceof Error ? err.message : "Kesalahan server"
      failed.push({ localId: tx.localId, reason: details ?? msg })
    }
  }

  const syncedPo: string[] = []
  const failedPo: { localId: string; reason: string }[] = []

  for (const po of parsed.data.purchaseOrders) {
    if (!po.localId) continue
    const existing = await prisma.purchaseOrder.findUnique({ where: { localId: po.localId } })
    if (existing) {
      syncedPo.push(po.localId)
      continue
    }
    try {
      if (po.supplier && po.supplierId) {
        await prisma.supplier.upsert({
          where: { id: po.supplierId },
          create: {
            id: po.supplierId,
            name: po.supplier.name,
            phone: po.supplier.phone ?? null,
            address: po.supplier.address ?? null,
            contactPerson: po.supplier.contactPerson ?? null,
          },
          update: {
            name: po.supplier.name,
            phone: po.supplier.phone ?? null,
            address: po.supplier.address ?? null,
            contactPerson: po.supplier.contactPerson ?? null,
          },
        })
      }
      await prisma.purchaseOrder.create({
        data: {
          supplierId: po.supplierId ?? null,
          userId: po.userId,
          status: po.status,
          notes: po.notes ?? null,
          createdAt: new Date(po.createdAt),
          receivedAt: po.receivedAt ? new Date(po.receivedAt) : null,
          syncStatus: "SYNCED",
          localId: po.localId,
          items: {
            create: po.items.map((i) => ({
              productVariantId: i.variantId,
              qty: i.qty,
              unitCost: i.unitCost,
              subtotal: i.subtotal,
            })),
          },
        },
      })
      syncedPo.push(po.localId)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Kesalahan server"
      failedPo.push({ localId: po.localId, reason: msg })
    }
  }

  return NextResponse.json({ synced, failed, syncedPo, failedPo })
}
