import { buildPoTotals } from "@/lib/purchase-order-service"
import { describe, expect, it } from "vitest"

describe("buildPoTotals", () => {
  it("computes subtotals and grand total", () => {
    const { grandTotal, itemsWithSubtotal } = buildPoTotals([
      { productVariantId: 1, qty: 10, unitCost: 5_000 },
      { productVariantId: 2, qty: 5, unitCost: 12_000 },
    ])
    expect(itemsWithSubtotal[0].subtotal).toBe(50_000)
    expect(itemsWithSubtotal[1].subtotal).toBe(60_000)
    expect(grandTotal).toBe(110_000)
  })
})
