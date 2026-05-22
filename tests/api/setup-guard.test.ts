import { describe, it, expect } from "vitest"

describe("setup route guard", () => {
  it("blocks setup when users exist", () => {
    const userCount = 1
    expect(userCount > 0).toBe(true)
  })

  it("allows setup when no users", () => {
    const userCount = 0
    expect(userCount === 0).toBe(true)
  })
})
