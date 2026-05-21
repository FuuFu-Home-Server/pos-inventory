import { describe, it, expect } from "vitest"
import { calcDifferences } from "@/lib/stock-opname-service"

describe("calcDifferences", () => {
  it("positive diff when physical > system", () => {
    expect(calcDifferences([{ systemQty: 10, physicalQty: 15 }])[0].difference).toBe(5)
  })

  it("negative diff when physical < system", () => {
    expect(calcDifferences([{ systemQty: 20, physicalQty: 12 }])[0].difference).toBe(-8)
  })

  it("zero diff when equal", () => {
    expect(calcDifferences([{ systemQty: 5, physicalQty: 5 }])[0].difference).toBe(0)
  })
})
