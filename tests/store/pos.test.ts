import { describe, it, expect, beforeEach } from "vitest"
import { usePosStore } from "@/store/pos"

describe("usePosStore", () => {
  beforeEach(() => {
    usePosStore.getState().reset()
  })

  const item = {
    variantId: 1,
    productId: 1,
    productName: "Beras",
    variantName: "5kg",
    unit: "karung",
    price: 10_000,
  }

  it("addItem adds new item with qty 1", () => {
    usePosStore.getState().addItem(item)
    expect(usePosStore.getState().items[0].qty).toBe(1)
  })

  it("addItem increments qty for existing variant", () => {
    usePosStore.getState().addItem(item)
    usePosStore.getState().addItem(item)
    expect(usePosStore.getState().items[0].qty).toBe(2)
    expect(usePosStore.getState().items).toHaveLength(1)
  })

  it("getSubtotal sums item subtotals", () => {
    usePosStore.getState().addItem(item)
    expect(usePosStore.getState().getSubtotal()).toBe(10_000)
  })

  it("getTotal subtracts transaction discount", () => {
    usePosStore.getState().addItem(item)
    usePosStore.getState().setDiscount(1, 2_000)
    expect(usePosStore.getState().getTotal()).toBe(8_000)
  })

  it("getTotal never below 0", () => {
    usePosStore.getState().addItem(item)
    usePosStore.getState().setDiscount(1, 999_999)
    expect(usePosStore.getState().getTotal()).toBeGreaterThanOrEqual(0)
  })

  it("getChange = paymentAmount - total", () => {
    usePosStore.getState().addItem(item)
    usePosStore.getState().setPaymentAmount(15_000)
    expect(usePosStore.getState().getChange()).toBe(5_000)
  })

  it("reset clears all state", () => {
    usePosStore.getState().addItem(item)
    usePosStore.getState().reset()
    expect(usePosStore.getState().items).toHaveLength(0)
  })
})
