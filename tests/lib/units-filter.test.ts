import { describe, it, expect } from "vitest"

type Unit = { id: number; name: string; isActive: boolean }

function filterUnits(units: Unit[], activeOnly: boolean): Unit[] {
  return activeOnly ? units.filter((u) => u.isActive) : units
}

const units: Unit[] = [
  { id: 1, name: "pcs", isActive: true },
  { id: 2, name: "kg", isActive: true },
  { id: 3, name: "dus", isActive: false },
  { id: 4, name: "karton", isActive: false },
]

describe("units active filter", () => {
  it("returns all units when activeOnly is false", () => {
    expect(filterUnits(units, false)).toHaveLength(4)
  })

  it("returns only active units when activeOnly is true", () => {
    const result = filterUnits(units, true)
    expect(result).toHaveLength(2)
    expect(result.every((u) => u.isActive)).toBe(true)
  })

  it("excludes inactive units by name", () => {
    const result = filterUnits(units, true)
    const names = result.map((u) => u.name)
    expect(names).not.toContain("dus")
    expect(names).not.toContain("karton")
  })

  it("returns empty when all units inactive", () => {
    const allInactive = units.map((u) => ({ ...u, isActive: false }))
    expect(filterUnits(allInactive, true)).toHaveLength(0)
  })

  it("returns all when all units active", () => {
    const allActive = units.map((u) => ({ ...u, isActive: true }))
    expect(filterUnits(allActive, true)).toHaveLength(4)
  })
})

describe("TRANSACTION discount mutual exclusion — PaymentPanel logic", () => {
  type StoredDiscount = { id: number; scope: string }

  function simulateToggle(applied: StoredDiscount[], incoming: StoredDiscount): StoredDiscount[] {
    const isAdding = !applied.some((a) => a.id === incoming.id)
    let next = [...applied]
    if (isAdding && incoming.scope === "TRANSACTION") {
      next = next.filter((a) => a.scope !== "TRANSACTION")
    }
    if (isAdding) {
      next = [...next, incoming]
    } else {
      next = next.filter((a) => a.id !== incoming.id)
    }
    return next
  }

  it("adding first TRANSACTION discount applies it", () => {
    const result = simulateToggle([], { id: 1, scope: "TRANSACTION" })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
  })

  it("adding second TRANSACTION discount evicts the first", () => {
    let applied: StoredDiscount[] = []
    applied = simulateToggle(applied, { id: 1, scope: "TRANSACTION" })
    applied = simulateToggle(applied, { id: 2, scope: "TRANSACTION" })
    expect(applied).toHaveLength(1)
    expect(applied[0].id).toBe(2)
  })

  it("adding PRODUCT discount does not evict TRANSACTION discount", () => {
    let applied: StoredDiscount[] = []
    applied = simulateToggle(applied, { id: 1, scope: "TRANSACTION" })
    applied = simulateToggle(applied, { id: 2, scope: "PRODUCT" })
    expect(applied).toHaveLength(2)
  })

  it("multiple PRODUCT discounts stack", () => {
    let applied: StoredDiscount[] = []
    applied = simulateToggle(applied, { id: 1, scope: "PRODUCT" })
    applied = simulateToggle(applied, { id: 2, scope: "PRODUCT" })
    expect(applied).toHaveLength(2)
  })

  it("toggling existing discount removes it", () => {
    let applied: StoredDiscount[] = [{ id: 1, scope: "TRANSACTION" }]
    applied = simulateToggle(applied, { id: 1, scope: "TRANSACTION" })
    expect(applied).toHaveLength(0)
  })
})
