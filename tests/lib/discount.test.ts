import { describe, it, expect } from "vitest"
import { calcTransactionDiscount, calcProductDiscount } from "@/lib/discount-calc"

describe("calcTransactionDiscount", () => {
  it("returns 0 for PRODUCT scope", () => {
    expect(
      calcTransactionDiscount(100_000, {
        type: "PERCENT",
        value: 10,
        scope: "PRODUCT",
        minPurchase: null,
      }),
    ).toBe(0)
  })

  it("calculates PERCENT", () => {
    expect(
      calcTransactionDiscount(100_000, {
        type: "PERCENT",
        value: 10,
        scope: "TRANSACTION",
        minPurchase: null,
      }),
    ).toBe(10_000)
  })

  it("calculates FLAT when minPurchase met", () => {
    expect(
      calcTransactionDiscount(75_000, {
        type: "FLAT",
        value: 5_000,
        scope: "TRANSACTION",
        minPurchase: 50_000,
      }),
    ).toBe(5_000)
  })

  it("returns 0 FLAT when minPurchase not met", () => {
    expect(
      calcTransactionDiscount(30_000, {
        type: "FLAT",
        value: 5_000,
        scope: "TRANSACTION",
        minPurchase: 50_000,
      }),
    ).toBe(0)
  })

  it("discount cannot exceed subtotal", () => {
    expect(
      calcTransactionDiscount(5_000, {
        type: "FLAT",
        value: 100_000,
        scope: "TRANSACTION",
        minPurchase: null,
      }),
    ).toBeLessThanOrEqual(5_000)
  })
})

describe("calcProductDiscount", () => {
  it("calculates PERCENT on item subtotal", () => {
    expect(
      calcProductDiscount(50_000, {
        type: "PERCENT",
        value: 20,
        scope: "PRODUCT",
        minPurchase: null,
      }),
    ).toBe(10_000)
  })

  it("calculates FLAT on item subtotal", () => {
    expect(
      calcProductDiscount(30_000, {
        type: "FLAT",
        value: 5_000,
        scope: "PRODUCT",
        minPurchase: null,
      }),
    ).toBe(5_000)
  })

  it("FLAT cannot exceed item subtotal", () => {
    expect(
      calcProductDiscount(3_000, {
        type: "FLAT",
        value: 50_000,
        scope: "PRODUCT",
        minPurchase: null,
      }),
    ).toBe(3_000)
  })

  it("returns 0 for TRANSACTION scope", () => {
    expect(
      calcProductDiscount(50_000, {
        type: "PERCENT",
        value: 10,
        scope: "TRANSACTION",
        minPurchase: null,
      }),
    ).toBe(0)
  })
})
