import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { rateLimit } from "@/lib/rate-limit"

describe("rateLimit", () => {
  it("allows requests under limit", () => {
    expect(rateLimit("10.0.0.1", 5, 60_000)).toBe(true)
    expect(rateLimit("10.0.0.1", 5, 60_000)).toBe(true)
  })

  it("blocks when limit exceeded", () => {
    const ip = "10.0.0.2"
    for (let i = 0; i < 3; i++) rateLimit(ip, 3, 60_000)
    expect(rateLimit(ip, 3, 60_000)).toBe(false)
  })

  it("tracks different IPs independently", () => {
    rateLimit("10.0.0.3", 1, 60_000)
    expect(rateLimit("10.0.0.3", 1, 60_000)).toBe(false)
    expect(rateLimit("10.0.0.4", 1, 60_000)).toBe(true)
  })

  it("resets count after window expires", () => {
    vi.useFakeTimers()
    const ip = "10.0.0.99"
    rateLimit(ip, 1, 1_000)
    expect(rateLimit(ip, 1, 1_000)).toBe(false)
    vi.advanceTimersByTime(1_001)
    expect(rateLimit(ip, 1, 1_000)).toBe(true)
    vi.useRealTimers()
  })
})
