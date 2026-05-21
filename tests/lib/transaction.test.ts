import { describe, it, expect } from "vitest"
import { buildTransactionTotals } from "@/lib/transaction-service"

describe("buildTransactionTotals", () => {
  it("computes subtotal from items", () => {
    const items = [
      { qty: 2, unitPrice: 10_000, itemDiscountAmt: 0 },
      { qty: 1, unitPrice: 5_000, itemDiscountAmt: 500 },
    ]
    expect(buildTransactionTotals(items, null).subtotal).toBe(24_500)
  })

  it("applies PERCENT transaction discount", () => {
    const { discountAmount, total } = buildTransactionTotals(
      [{ qty: 1, unitPrice: 100_000, itemDiscountAmt: 0 }],
      { type: "PERCENT", value: 10, scope: "TRANSACTION", minPurchase: null }
    )
    expect(discountAmount).toBe(10_000)
    expect(total).toBe(90_000)
  })

  it("total never goes below 0", () => {
    const { total } = buildTransactionTotals(
      [{ qty: 1, unitPrice: 1_000, itemDiscountAmt: 0 }],
      { type: "FLAT", value: 999_999, scope: "TRANSACTION", minPurchase: null }
    )
    expect(total).toBeGreaterThanOrEqual(0)
  })
})
