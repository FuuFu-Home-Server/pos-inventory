import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildTransactionTotals } from "@/lib/transaction-service"
import { completeTransactionSchema } from "@/lib/validations/transaction"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get("page") ?? 1))
  const limit = Math.min(100, Number(searchParams.get("limit") ?? 20))
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const paymentMethodId = searchParams.get("paymentMethodId")
  const userId = searchParams.get("userId")
  const customerId = searchParams.get("customerId")

  const where: Record<string, unknown> = {}
  if (from && to) where.createdAt = { gte: new Date(from), lte: new Date(`${to}T23:59:59`) }
  if (paymentMethodId) where.paymentMethodId = Number(paymentMethodId)
  if (userId) where.userId = Number(userId)
  if (customerId) where.customerId = Number(customerId)
  const syncStatus = searchParams.get("syncStatus")
  if (syncStatus) where.syncStatus = syncStatus

  const appliedWhere = Object.keys(where).length ? where : undefined

  const [transactions, total, revenueAgg] = await Promise.all([
    prisma.transaction.findMany({
      where: appliedWhere,
      include: {
        user: { select: { name: true } },
        customer: { select: { name: true } },
        paymentMethod: { select: { name: true } },
        _count: { select: { items: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.transaction.count({ where: appliedWhere }),
    prisma.transaction.aggregate({
      where: { ...(appliedWhere ?? {}), status: "COMPLETED" },
      _sum: { total: true },
      _count: { id: true },
    }),
  ])

  return NextResponse.json({
    transactions,
    total,
    page,
    limit,
    totalRevenue: Number(revenueAgg._sum.total ?? 0),
    completedCount: revenueAgg._count.id,
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = completeTransactionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { items, customerId, discountId, paymentMethodId, paymentAmount, localId } = parsed.data

  try {
    const result = await prisma.$transaction(async (tx) => {
      const insufficient: string[] = []
      const variants = await Promise.all(
        items.map((item) =>
          tx.productVariant.findUnique({
            where: { id: item.variantId },
            include: { product: { select: { name: true } } },
          }),
        ),
      )

      for (let i = 0; i < items.length; i++) {
        const v = variants[i]
        if (!v) {
          insufficient.push(`Variant ID ${items[i].variantId} tidak ditemukan`)
          continue
        }
        if (v.stock < items[i].qty) {
          insufficient.push(
            `${v.product.name} ${v.variantName}: stok ${v.stock}, butuh ${items[i].qty}`,
          )
        }
      }
      if (insufficient.length > 0)
        throw Object.assign(new Error("INSUFFICIENT_STOCK"), { details: insufficient })

      let discountData: {
        type: "PERCENT" | "FLAT"
        value: number
        scope: "TRANSACTION" | "PRODUCT"
        minPurchase: number | null
      } | null = null
      if (discountId) {
        const d = await tx.discount.findUnique({ where: { id: discountId, isActive: true } })
        if (d) {
          discountData = {
            type: d.type as "PERCENT" | "FLAT",
            value: Number(d.value),
            scope: d.scope as "TRANSACTION" | "PRODUCT",
            minPurchase: d.minPurchase ? Number(d.minPurchase) : null,
          }
        }
      }

      const { subtotal, discountAmount, total } = buildTransactionTotals(
        items.map((i) => ({
          qty: i.qty,
          unitPrice: i.unitPrice,
          itemDiscountAmt: i.itemDiscountAmt,
        })),
        discountData,
      )
      const changeAmount = Math.max(0, paymentAmount - total)

      const transaction = await tx.transaction.create({
        data: {
          userId: Number(session.user.id),
          customerId: customerId ?? null,
          discountId: discountId ?? null,
          paymentMethodId,
          discountAmount,
          subtotal,
          total,
          paymentAmount,
          changeAmount,
          status: "COMPLETED",
          syncStatus: "SYNCED",
          localId: localId ?? null,
          items: {
            create: items.map((item) => ({
              productVariantId: item.variantId,
              qty: item.qty,
              unitPrice: item.unitPrice,
              itemDiscountAmt: item.itemDiscountAmt,
              subtotal: item.qty * item.unitPrice - item.itemDiscountAmt,
            })),
          },
        },
        include: {
          items: {
            include: {
              productVariant: { include: { product: { select: { name: true } } } },
            },
          },
          paymentMethod: true,
          customer: true,
          user: { select: { name: true } },
          discount: true,
        },
      })

      await Promise.all(
        items.map((item) =>
          tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.qty } },
          }),
        ),
      )

      return transaction
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "INSUFFICIENT_STOCK") {
      return NextResponse.json(
        { error: "Stok tidak cukup", details: (err as any).details },
        { status: 409 },
      )
    }
    console.error(err)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}
