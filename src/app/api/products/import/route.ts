import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function normalizeStr(v: string) {
  return v.trim().replace(/\s+/g, " ")
}

function parseNum(v: string): number {
  return Number(v.replace(/[^\d.-]/g, "")) || 0
}

function parseNullableNum(v: string): number | null {
  const s = v.trim()
  if (!s) return null
  const n = Number(s.replace(/[^\d.-]/g, ""))
  return isNaN(n) ? null : n
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    headers: string[]
    rows: string[][]
    mapping: Record<string, string>
  }

  const { headers, rows, mapping } = body
  if (!headers || !rows || !mapping) {
    return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 })
  }

  const col = (row: string[], field: string): string => {
    const csvCol = mapping[field]
    if (!csvCol) return ""
    const i = headers.indexOf(csvCol)
    return i >= 0 ? (row[i] ?? "").trim() : ""
  }

  let created = 0
  let updated = 0
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const lineNum = i + 2

    const name = normalizeStr(col(row, "name"))
    const category = normalizeStr(col(row, "category")) || "Umum"
    const variantName = normalizeStr(col(row, "variantName")) || "Standard"
    const priceRaw = col(row, "price")
    const unit = normalizeStr(col(row, "unit")) || "pcs"

    if (!name) {
      errors.push(`Baris ${lineNum}: nama produk kosong`)
      continue
    }
    if (!priceRaw) {
      errors.push(`Baris ${lineNum}: harga kosong`)
      continue
    }

    const price = parseNum(priceRaw)
    const barcode = col(row, "barcode") || null
    const costPrice = parseNullableNum(col(row, "costPrice"))
    const stock = parseNum(col(row, "stock"))
    const lowStockThreshold = parseNum(col(row, "lowStockThreshold")) || 5

    try {
      const product =
        (await prisma.product.findFirst({ where: { name, category } })) ??
        (await prisma.product.create({ data: { name, category } }))

      const existing = barcode
        ? await prisma.productVariant.findUnique({ where: { barcode } })
        : await prisma.productVariant.findFirst({ where: { productId: product.id, variantName } })

      if (existing) {
        await prisma.productVariant.update({
          where: { id: existing.id },
          data: { variantName, price, costPrice, stock, unit, lowStockThreshold },
        })
        updated++
      } else {
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            variantName,
            barcode,
            price,
            costPrice: costPrice ?? undefined,
            stock,
            unit,
            lowStockThreshold,
          },
        })
        created++
      }
    } catch (e: any) {
      errors.push(`Baris ${lineNum} (${name}): ${e.message}`)
    }
  }

  return NextResponse.json({ created, updated, errors })
}
