import "@testing-library/jest-dom"
import { vi } from "vitest"

if (typeof window !== "undefined") {
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
}

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    role: { findUnique: vi.fn(), findMany: vi.fn() },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    supplier: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    customer: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
    productVariant: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    paymentMethod: { findUnique: vi.fn(), findMany: vi.fn() },
    discount: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    transaction: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn() },
    transactionItem: { create: vi.fn(), createMany: vi.fn(), findMany: vi.fn() },
    purchaseOrder: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    purchaseOrderItem: { create: vi.fn(), createMany: vi.fn(), findMany: vi.fn() },
    stockOpname: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
    stockOpnameItem: { updateMany: vi.fn() },
    receiptConfig: { findUnique: vi.fn(), upsert: vi.fn() },
    importLog: { create: vi.fn(), findMany: vi.fn() },
  },
}))
