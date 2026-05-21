import { calcTransactionDiscount } from "@/lib/discount-calc"

type ItemInput = {
  qty: number
  unitPrice: number
  itemDiscountAmt: number
}

type DiscountInput = {
  type: "PERCENT" | "FLAT"
  value: number
  scope: "TRANSACTION" | "PRODUCT"
  minPurchase: number | null
} | null

export function buildTransactionTotals(items: ItemInput[], discount: DiscountInput) {
  const subtotal = items.reduce((sum, i) => sum + i.qty * i.unitPrice - i.itemDiscountAmt, 0)
  const discountAmount = discount ? calcTransactionDiscount(subtotal, discount) : 0
  const total = Math.max(0, subtotal - discountAmount)
  return { subtotal, discountAmount, total }
}
