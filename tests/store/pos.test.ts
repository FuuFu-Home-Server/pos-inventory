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
    usePosStore
      .getState()
      .toggleDiscount({
        id: 1,
        type: "FLAT",
        value: 2_000,
        scope: "TRANSACTION",
        minPurchase: null,
      })
    expect(usePosStore.getState().getTotal()).toBe(8_000)
  })

  it("getTotal never below 0", () => {
    usePosStore.getState().addItem(item)
    usePosStore
      .getState()
      .toggleDiscount({
        id: 1,
        type: "FLAT",
        value: 999_999,
        scope: "TRANSACTION",
        minPurchase: null,
      })
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

  it("removeItem removes correct item", () => {
    const item2 = { ...item, variantId: 2, productName: "Gula", price: 5_000 }
    usePosStore.getState().addItem(item)
    usePosStore.getState().addItem(item2)
    usePosStore.getState().removeItem(1)
    expect(usePosStore.getState().items).toHaveLength(1)
    expect(usePosStore.getState().items[0].variantId).toBe(2)
  })

  describe("updateQty", () => {
    it("updates qty and recalculates subtotal", () => {
      usePosStore.getState().addItem(item)
      usePosStore.getState().updateQty(1, 3)
      const i = usePosStore.getState().items[0]
      expect(i.qty).toBe(3)
      expect(i.subtotal).toBe(30_000)
    })

    it("qty <= 0 removes item", () => {
      usePosStore.getState().addItem(item)
      usePosStore.getState().updateQty(1, 0)
      expect(usePosStore.getState().items).toHaveLength(0)
    })
  })

  describe("changeVariant", () => {
    it("replaces variant while preserving qty", () => {
      usePosStore.getState().addItem(item)
      usePosStore.getState().updateQty(1, 3)
      usePosStore.getState().changeVariant(1, {
        variantId: 2,
        productId: 1,
        productName: "Beras",
        variantName: "10kg",
        unit: "karung",
        price: 20_000,
      })
      const items = usePosStore.getState().items
      expect(items).toHaveLength(1)
      expect(items[0].variantId).toBe(2)
      expect(items[0].qty).toBe(3)
      expect(items[0].subtotal).toBe(60_000)
    })
  })

  describe("setItemDiscount", () => {
    it("sets per-item discount and recalculates subtotal", () => {
      usePosStore.getState().addItem(item)
      usePosStore.getState().setItemDiscount(1, 2_000)
      const i = usePosStore.getState().items[0]
      expect(i.itemDiscountAmt).toBe(2_000)
      expect(i.subtotal).toBe(8_000)
    })
  })

  describe("setCustomer / setPaymentMethod", () => {
    it("setCustomer stores customerId", () => {
      usePosStore.getState().setCustomer(42)
      expect(usePosStore.getState().customerId).toBe(42)
    })

    it("setCustomer accepts null", () => {
      usePosStore.getState().setCustomer(42)
      usePosStore.getState().setCustomer(null)
      expect(usePosStore.getState().customerId).toBeNull()
    })

    it("setPaymentMethod stores paymentMethodId", () => {
      usePosStore.getState().setPaymentMethod(3)
      expect(usePosStore.getState().paymentMethodId).toBe(3)
    })

    it("setPaymentMethod accepts null", () => {
      usePosStore.getState().setPaymentMethod(3)
      usePosStore.getState().setPaymentMethod(null)
      expect(usePosStore.getState().paymentMethodId).toBeNull()
    })
  })

  describe("toggleDiscount", () => {
    const flatDiscount = {
      id: 1,
      type: "FLAT",
      value: 3_000,
      scope: "TRANSACTION",
      minPurchase: null,
    }
    const percentDiscount = {
      id: 2,
      type: "PERCENT",
      value: 10,
      scope: "TRANSACTION",
      minPurchase: null,
    }
    const minPurchaseDiscount = {
      id: 3,
      type: "FLAT",
      value: 2_000,
      scope: "TRANSACTION",
      minPurchase: 50_000,
    }

    it("FLAT discount subtracts fixed amount", () => {
      usePosStore.getState().addItem(item)
      usePosStore.getState().toggleDiscount(flatDiscount)
      expect(usePosStore.getState().getTotal()).toBe(7_000)
    })

    it("PERCENT discount subtracts percentage of subtotal", () => {
      usePosStore.getState().addItem(item)
      usePosStore.getState().toggleDiscount(percentDiscount)
      expect(usePosStore.getState().getTotal()).toBe(9_000)
    })

    it("minPurchase not met → discount amount is 0", () => {
      usePosStore.getState().addItem(item)
      usePosStore.getState().toggleDiscount(minPurchaseDiscount)
      expect(usePosStore.getState().getDiscountAmounts()[3]).toBe(0)
      expect(usePosStore.getState().getTotal()).toBe(10_000)
    })

    it("minPurchase met → discount applies", () => {
      usePosStore.getState().addItem({ ...item, price: 60_000 })
      usePosStore.getState().toggleDiscount(minPurchaseDiscount)
      expect(usePosStore.getState().getDiscountAmounts()[3]).toBe(2_000)
      expect(usePosStore.getState().getTotal()).toBe(58_000)
    })

    it("toggling same discount twice removes it", () => {
      usePosStore.getState().addItem(item)
      usePosStore.getState().toggleDiscount(flatDiscount)
      usePosStore.getState().toggleDiscount(flatDiscount)
      expect(usePosStore.getState().appliedDiscounts).toHaveLength(0)
      expect(usePosStore.getState().getTotal()).toBe(10_000)
    })

    it("getDiscountAmounts returns per-id map", () => {
      usePosStore.getState().addItem(item)
      usePosStore.getState().toggleDiscount(flatDiscount)
      const amounts = usePosStore.getState().getDiscountAmounts()
      expect(amounts[1]).toBe(3_000)
    })

    it("FLAT discount cannot exceed subtotal", () => {
      usePosStore.getState().addItem(item)
      usePosStore.getState().toggleDiscount({ ...flatDiscount, value: 999_999 })
      expect(usePosStore.getState().getDiscountAmounts()[1]).toBe(10_000)
      expect(usePosStore.getState().getTotal()).toBe(0)
    })

    it("multiple PRODUCT-scope discounts stack", () => {
      usePosStore.getState().addItem(item)
      const d1 = { id: 10, type: "FLAT", value: 1_000, scope: "PRODUCT", minPurchase: null }
      const d2 = { id: 11, type: "FLAT", value: 2_000, scope: "PRODUCT", minPurchase: null }
      usePosStore.getState().toggleDiscount(d1)
      usePosStore.getState().toggleDiscount(d2)
      expect(usePosStore.getState().appliedDiscounts).toHaveLength(2)
      expect(usePosStore.getState().getDiscountTotal()).toBe(3_000)
    })
  })
})
