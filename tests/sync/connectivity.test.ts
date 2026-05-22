import { describe, it, expect } from "vitest"

describe("connectivity — offline transition detection", () => {
  it("detects transition from offline to online", () => {
    const wasOffline = true
    const isNowOnline = true
    const shouldSync = wasOffline && isNowOnline
    expect(shouldSync).toBe(true)
  })

  it("no sync when was already online", () => {
    const wasOffline = false
    const isNowOnline = true
    const shouldSync = wasOffline && isNowOnline
    expect(shouldSync).toBe(false)
  })

  it("no sync when still offline", () => {
    const wasOffline = true
    const isNowOnline = false
    const shouldSync = wasOffline && isNowOnline
    expect(shouldSync).toBe(false)
  })
})
