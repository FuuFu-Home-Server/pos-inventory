import { renderHook } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { useSyncStatus } from "@/hooks/useSyncStatus"

describe("useSyncStatus", () => {
  it("returns default status when no electronAPI", () => {
    const { result } = renderHook(() => useSyncStatus())
    expect(result.current.isOnline).toBe(true)
    expect(result.current.pendingCount).toBe(0)
    expect(result.current.failedCount).toBe(0)
    expect(result.current.syncing).toBe(false)
    expect(result.current.lastSyncAt).toBeNull()
    expect(result.current.syncProgress).toBeNull()
  })

  it("exposes triggerSync function", () => {
    const { result } = renderHook(() => useSyncStatus())
    expect(typeof result.current.triggerSync).toBe("function")
  })

  it("triggerSync does nothing without electronAPI", () => {
    const { result } = renderHook(() => useSyncStatus())
    expect(() => result.current.triggerSync()).not.toThrow()
  })
})
