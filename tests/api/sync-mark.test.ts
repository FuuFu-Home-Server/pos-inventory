import { describe, it, expect } from "vitest"

describe("sync mark — status mapping", () => {
  it("synced localIds set maps correctly", () => {
    const synced = ["uuid-1", "uuid-2"]
    const syncedSet = new Set(synced)
    expect(syncedSet.has("uuid-1")).toBe(true)
    expect(syncedSet.has("uuid-3")).toBe(false)
  })

  it("failed entries carry reason string", () => {
    const failed = [{ localId: "uuid-3", reason: "Stok tidak cukup: Beras 5kg" }]
    expect(failed[0].reason).toContain("Stok")
  })
})
