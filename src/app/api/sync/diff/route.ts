import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type Summary = Record<string, number>

async function getLocalSummary(): Promise<Summary> {
  const [
    roles,
    users,
    categories,
    units,
    products,
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
  ] = await Promise.all([
    prisma.role.count(),
    prisma.user.count(),
    prisma.categoryOption.count(),
    prisma.unitOption.count(),
    prisma.product.count(),
    prisma.productVariant.count(),
    prisma.paymentMethod.count(),
    prisma.discount.count(),
    prisma.customer.count(),
    prisma.supplier.count(),
    prisma.transaction.count(),
    prisma.purchaseOrder.count(),
    prisma.purchaseList.count(),
    prisma.stockOpname.count(),
    prisma.receiptConfig.findUnique({ where: { id: 1 } }),
  ])

  return {
    roles,
    users,
    categories,
    units,
    products,
    variants,
    paymentMethods,
    discounts,
    customers,
    suppliers,
    transactions,
    purchaseOrders,
    purchaseLists,
    stockOpnames,
    receiptConfig: receiptConfig ? 1 : 0,
  }
}

export async function GET(req: NextRequest) {
  const remoteUrl = req.nextUrl.searchParams.get("remoteUrl")
  const secret = req.nextUrl.searchParams.get("secret")

  if (!remoteUrl || !secret)
    return NextResponse.json({ error: "remoteUrl and secret required" }, { status: 400 })

  const [local, remoteRes] = await Promise.all([
    getLocalSummary(),
    fetch(`${remoteUrl}/api/sync/summary`, { headers: { "X-Sync-Secret": secret } }),
  ])

  if (!remoteRes.ok)
    return NextResponse.json(
      { error: `Remote summary failed: ${remoteRes.status} ${await remoteRes.text()}` },
      { status: 502 },
    )

  const server: Summary = await remoteRes.json()

  const tables = Object.keys(local)
  const diff: Record<string, { local: number; server: number; delta: number; match: boolean }> = {}
  let hasDifferences = false

  for (const table of tables) {
    const l = local[table] ?? 0
    const s = server[table] ?? 0
    const match = l === s
    if (!match) hasDifferences = true
    diff[table] = { local: l, server: s, delta: l - s, match }
  }

  return NextResponse.json({ local, server, diff, hasDifferences })
}
