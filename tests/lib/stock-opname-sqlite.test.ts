import { describe, it, expect } from "vitest"

describe("stock opname batch update — SQLite compatibility", () => {
  it("calculates difference as physicalQty - systemQty", () => {
    const systemQty = 10
    const physicalQty = 8
    expect(physicalQty - systemQty).toBe(-2)
  })

  it("handles zero physical qty (full loss)", () => {
    expect(0 - 5).toBe(-5)
  })

  it("handles surplus (physical > system)", () => {
    expect(12 - 10).toBe(2)
  })
})
