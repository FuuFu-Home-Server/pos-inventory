type DiscountInput = {
  type: "PERCENT" | "FLAT"
  value: number
  scope: "TRANSACTION" | "PRODUCT"
  minPurchase: number | null
}

export function calcTransactionDiscount(subtotal: number, discount: DiscountInput): number {
  if (discount.scope !== "TRANSACTION") return 0
  if (discount.minPurchase != null && subtotal < discount.minPurchase) return 0
  if (discount.type === "PERCENT") return Math.round((subtotal * discount.value) / 100)
  return Math.min(discount.value, subtotal)
}

export function calcProductDiscount(itemSubtotal: number, discount: DiscountInput): number {
  if (discount.scope !== "PRODUCT") return 0
  if (discount.type === "PERCENT") return Math.round((itemSubtotal * discount.value) / 100)
  return Math.min(discount.value, itemSubtotal)
}
