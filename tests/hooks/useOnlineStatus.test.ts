import { renderHook } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { useOnlineStatus } from "@/hooks/useOnlineStatus"

describe("useOnlineStatus", () => {
  it("returns true by default (no electronAPI)", () => {
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(true)
  })
})
