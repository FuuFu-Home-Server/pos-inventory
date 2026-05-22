import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const dateFilter =
    from && to ? { gte: new Date(from), lte: new Date(`${to}T23:59:59`) } : undefined

  const [transactions, purchaseOrders, purchaseLists] = await Promise.all([
    prisma.transaction.findMany({
      where: { status: "COMPLETED", ...(dateFilter ? { createdAt: dateFilter } : {}) },
      select: {
        id: true,
        total: true,
        createdAt: true,
        paymentMethod: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.purchaseOrder.findMany({
      where: { status: "RECEIVED", ...(dateFilter ? { receivedAt: dateFilter } : {}) },
      select: {
        id: true,
        createdAt: true,
        receivedAt: true,
        supplier: { select: { name: true } },
        items: { select: { qty: true, unitCost: true, subtotal: true } },
      },
      orderBy: { receivedAt: "desc" },
    }),
    prisma.purchaseList.findMany({
      where: { status: "DONE", ...(dateFilter ? { createdAt: dateFilter } : {}) },
      include: { items: { select: { qty: true, unitCost: true, isPurchased: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ])

  const entries = [
    ...transactions.map((t) => ({
      id: `tx-${t.id}`,
      type: "income" as const,
      amount: Number(t.total),
      description: `Penjualan #${t.id} (${t._count.items} item) — ${t.paymentMethod.name}`,
      date: t.createdAt,
      ref: { type: "TRANSACTION", id: t.id },
    })),
    ...purchaseOrders.map((po) => ({
      id: `po-${po.id}`,
      type: "expense" as const,
      amount: po.items.reduce((s, i) => s + Number(i.subtotal), 0),
      description: `PO #${po.id} — ${po.supplier?.name ?? "Tanpa Supplier"} (${po.items.length} item)`,
      date: po.receivedAt ?? po.createdAt,
      ref: { type: "PURCHASE_ORDER", id: po.id },
    })),
    ...purchaseLists
      .map((pl) => ({
        id: `pl-${pl.id}`,
        type: "expense" as const,
        amount: pl.items
          .filter((i) => i.isPurchased)
          .reduce((s, i) => s + Number(i.unitCost) * i.qty, 0),
        description: `Belanja — ${pl.title} (${pl.items.filter((i) => i.isPurchased).length} item)`,
        date: pl.createdAt,
        ref: { type: "PURCHASE_LIST", id: pl.id },
      }))
      .filter((e) => e.amount > 0),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const totalIncome = entries.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0)
  const totalExpense = entries.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0)

  return NextResponse.json({
    entries,
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
  })
}
