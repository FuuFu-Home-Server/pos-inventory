import { describe, it, expect } from "vitest"
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
})
