import { describe, it, expect } from "vitest"
import { createDiscountSchema, updateDiscountSchema } from "@/lib/validations/discount"
import { createProductSchema, variantSchema, updateVariantSchema } from "@/lib/validations/product"
import { createSupplierSchema, updateSupplierSchema } from "@/lib/validations/supplier"
import { createCustomerSchema, updateCustomerSchema } from "@/lib/validations/customer"
import { createUserSchema, updateUserSchema } from "@/lib/validations/user"
import { createPurchaseOrderSchema, poItemSchema } from "@/lib/validations/purchase-order"
import {
  createStockOpnameSchema,
  updateOpnameItemSchema,
  confirmOpnameSchema,
} from "@/lib/validations/stock-opname"
import { completeTransactionSchema, transactionItemSchema } from "@/lib/validations/transaction"

describe("transactionItemSchema", () => {
  it("accepts valid item", () => {
    expect(
      transactionItemSchema.safeParse({
        variantId: 1,
        qty: 2,
        unitPrice: 5_000,
        itemDiscountAmt: 0,
      }).success,
    ).toBe(true)
  })

  it("rejects qty <= 0", () => {
    expect(
      transactionItemSchema.safeParse({
        variantId: 1,
        qty: 0,
        unitPrice: 5_000,
        itemDiscountAmt: 0,
      }).success,
    ).toBe(false)
  })

  it("rejects negative unitPrice", () => {
    expect(
      transactionItemSchema.safeParse({ variantId: 1, qty: 1, unitPrice: -1, itemDiscountAmt: 0 })
        .success,
    ).toBe(false)
  })

  it("itemDiscountAmt defaults to 0 when omitted", () => {
    const result = transactionItemSchema.safeParse({ variantId: 1, qty: 1, unitPrice: 1_000 })
    expect(result.success && result.data.itemDiscountAmt).toBe(0)
  })
})

describe("completeTransactionSchema", () => {
  const validItem = { variantId: 1, qty: 1, unitPrice: 10_000, itemDiscountAmt: 0 }

  it("accepts valid transaction", () => {
    expect(
      completeTransactionSchema.safeParse({
        items: [validItem],
        paymentMethodId: 1,
        paymentAmount: 10_000,
      }).success,
    ).toBe(true)
  })

  it("rejects empty items array", () => {
    expect(
      completeTransactionSchema.safeParse({ items: [], paymentMethodId: 1, paymentAmount: 10_000 })
        .success,
    ).toBe(false)
  })

  it("rejects missing paymentMethodId", () => {
    expect(
      completeTransactionSchema.safeParse({ items: [validItem], paymentAmount: 10_000 }).success,
    ).toBe(false)
  })

  it("accepts optional customerId and discountId", () => {
    expect(
      completeTransactionSchema.safeParse({
        items: [validItem],
        paymentMethodId: 1,
        paymentAmount: 10_000,
        customerId: 5,
        discountId: 2,
      }).success,
    ).toBe(true)
  })
})

describe("createDiscountSchema", () => {
  const base = {
    name: "Diskon Lebaran",
    type: "PERCENT" as const,
    value: 10,
    scope: "TRANSACTION" as const,
  }

  it("accepts valid transaction discount", () => {
    expect(createDiscountSchema.safeParse(base).success).toBe(true)
  })

  it("rejects PRODUCT scope without productId", () => {
    const result = createDiscountSchema.safeParse({ ...base, scope: "PRODUCT" })
    expect(result.success).toBe(false)
  })

  it("accepts PRODUCT scope with productId", () => {
    expect(
      createDiscountSchema.safeParse({ ...base, scope: "PRODUCT", productId: 1 }).success,
    ).toBe(true)
  })

  it("rejects empty name", () => {
    expect(createDiscountSchema.safeParse({ ...base, name: "" }).success).toBe(false)
  })

  it("rejects value <= 0", () => {
    expect(createDiscountSchema.safeParse({ ...base, value: 0 }).success).toBe(false)
  })

  it("updateDiscountSchema allows partial fields", () => {
    expect(updateDiscountSchema.safeParse({ name: "Updated" }).success).toBe(true)
    expect(updateDiscountSchema.safeParse({}).success).toBe(true)
  })
})

describe("createProductSchema", () => {
  const validVariant = {
    variantName: "pcs",
    price: 5_000,
    stock: 10,
    unit: "pcs",
  }

  it("accepts valid product", () => {
    expect(
      createProductSchema.safeParse({
        name: "Mie Instan",
        category: "Makanan",
        variants: [validVariant],
      }).success,
    ).toBe(true)
  })

  it("rejects empty name", () => {
    expect(
      createProductSchema.safeParse({ name: "", category: "Makanan", variants: [validVariant] })
        .success,
    ).toBe(false)
  })

  it("rejects empty variants array", () => {
    expect(createProductSchema.safeParse({ name: "X", category: "Y", variants: [] }).success).toBe(
      false,
    )
  })
})

describe("variantSchema", () => {
  it("rejects negative stock", () => {
    expect(
      variantSchema.safeParse({ variantName: "pcs", price: 1_000, stock: -1, unit: "pcs" }).success,
    ).toBe(false)
  })

  it("lowStockThreshold defaults to 5", () => {
    const result = variantSchema.safeParse({
      variantName: "pcs",
      price: 1_000,
      stock: 0,
      unit: "pcs",
    })
    expect(result.success && result.data.lowStockThreshold).toBe(5)
  })

  it("updateVariantSchema allows partial", () => {
    expect(updateVariantSchema.safeParse({ price: 2_000 }).success).toBe(true)
  })
})

describe("createSupplierSchema", () => {
  it("accepts name only", () => {
    expect(createSupplierSchema.safeParse({ name: "Supplier A" }).success).toBe(true)
  })

  it("rejects empty name", () => {
    expect(createSupplierSchema.safeParse({ name: "" }).success).toBe(false)
  })

  it("updateSupplierSchema allows partial", () => {
    expect(updateSupplierSchema.safeParse({ phone: "0812" }).success).toBe(true)
    expect(updateSupplierSchema.safeParse({}).success).toBe(true)
  })
})

describe("createCustomerSchema", () => {
  it("accepts name only", () => {
    expect(createCustomerSchema.safeParse({ name: "Budi" }).success).toBe(true)
  })

  it("rejects empty name", () => {
    expect(createCustomerSchema.safeParse({ name: "" }).success).toBe(false)
  })

  it("updateCustomerSchema allows partial", () => {
    expect(updateCustomerSchema.safeParse({}).success).toBe(true)
  })
})

describe("createUserSchema", () => {
  const valid = {
    name: "Admin",
    email: "admin@toko.com",
    password: "password123",
    role: "ADMIN" as const,
  }

  it("accepts valid user", () => {
    expect(createUserSchema.safeParse(valid).success).toBe(true)
  })

  it("rejects invalid email", () => {
    expect(createUserSchema.safeParse({ ...valid, email: "bukan-email" }).success).toBe(false)
  })

  it("rejects password shorter than 8 chars", () => {
    expect(createUserSchema.safeParse({ ...valid, password: "short" }).success).toBe(false)
  })

  it("rejects invalid role", () => {
    expect(createUserSchema.safeParse({ ...valid, role: "MANAGER" }).success).toBe(false)
  })

  it("updateUserSchema allows partial", () => {
    expect(updateUserSchema.safeParse({ name: "New Name" }).success).toBe(true)
    expect(updateUserSchema.safeParse({}).success).toBe(true)
  })
})

describe("createPurchaseOrderSchema", () => {
  const validItem = { productVariantId: 1, qty: 10, unitCost: 5_000 }

  it("accepts valid PO", () => {
    expect(createPurchaseOrderSchema.safeParse({ supplierId: 1, items: [validItem] }).success).toBe(
      true,
    )
  })

  it("rejects missing supplierId", () => {
    expect(createPurchaseOrderSchema.safeParse({ items: [validItem] }).success).toBe(false)
  })

  it("rejects empty items", () => {
    expect(createPurchaseOrderSchema.safeParse({ supplierId: 1, items: [] }).success).toBe(false)
  })
})

describe("poItemSchema", () => {
  it("rejects qty <= 0", () => {
    expect(poItemSchema.safeParse({ productVariantId: 1, qty: 0, unitCost: 1_000 }).success).toBe(
      false,
    )
  })

  it("rejects unitCost <= 0", () => {
    expect(poItemSchema.safeParse({ productVariantId: 1, qty: 1, unitCost: 0 }).success).toBe(false)
  })
})

describe("stock opname schemas", () => {
  it("createStockOpnameSchema accepts empty object", () => {
    expect(createStockOpnameSchema.safeParse({}).success).toBe(true)
  })

  it("updateOpnameItemSchema rejects negative physicalQty", () => {
    expect(updateOpnameItemSchema.safeParse({ physicalQty: -1 }).success).toBe(false)
  })

  it("updateOpnameItemSchema accepts 0", () => {
    expect(updateOpnameItemSchema.safeParse({ physicalQty: 0 }).success).toBe(true)
  })

  it("confirmOpnameSchema rejects missing opnameId", () => {
    expect(confirmOpnameSchema.safeParse({}).success).toBe(false)
  })

  it("confirmOpnameSchema accepts valid opnameId", () => {
    expect(confirmOpnameSchema.safeParse({ opnameId: 1 }).success).toBe(true)
  })
})
