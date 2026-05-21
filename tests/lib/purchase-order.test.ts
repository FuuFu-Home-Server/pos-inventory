import { describe, it, expect } from "vitest"
import { buildPoTotals } from "@/lib/purchase-order-service"

describe("buildPoTotals", () => {
  it("computes subtotals and grand total", () => {
    const { grandTotal, itemsWithSubtotal } = buildPoTotals([
      { qty: 10, unitCost: 5_000 },
      { qty: 5,  unitCost: 12_000 },
    ])
    expect(itemsWithSubtotal[0].subtotal).toBe(50_000)
    expect(itemsWithSubtotal[1].subtotal).toBe(60_000)
    expect(grandTotal).toBe(110_000)
  })
})
