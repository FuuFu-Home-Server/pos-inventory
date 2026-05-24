import { describe, it, expect } from "vitest"
import { formatRupiah, formatRupiahCompact, formatDate, formatDateShort } from "@/lib/format"

describe("formatRupiah", () => {
  it("formats zero", () => {
    expect(formatRupiah(0)).toBe("Rp 0")
  })

  it("formats thousands", () => {
    expect(formatRupiah(10_000)).toBe("Rp 10.000")
  })

  it("formats millions", () => {
    expect(formatRupiah(1_500_000)).toBe("Rp 1.500.000")
  })

  it("no decimal digits for whole amounts", () => {
    expect(formatRupiah(25_000)).not.toContain(",")
  })
})

describe("formatRupiahCompact", () => {
  it("falls back to formatRupiah for amounts < 1 million", () => {
    expect(formatRupiahCompact(500_000)).toBe(formatRupiah(500_000))
  })

  it("uses Jt suffix for millions", () => {
    expect(formatRupiahCompact(2_500_000)).toContain("Jt")
    expect(formatRupiahCompact(2_500_000)).toContain("2,5")
  })

  it("uses M suffix for billions", () => {
    expect(formatRupiahCompact(3_000_000_000)).toContain("M")
    expect(formatRupiahCompact(3_000_000_000)).toContain("3")
  })

  it("rounds to 1 decimal for Jt", () => {
    const result = formatRupiahCompact(1_750_000)
    expect(result).toContain("1,8")
    expect(result).toContain("Jt")
  })
})

describe("formatDate", () => {
  it("returns a non-empty string", () => {
    expect(formatDate(new Date("2024-01-15T10:30:00"))).toBeTruthy()
  })

  it("accepts string input", () => {
    expect(() => formatDate("2024-06-01T08:00:00")).not.toThrow()
  })

  it("includes year in output", () => {
    expect(formatDate(new Date("2024-03-20T12:00:00"))).toContain("2024")
  })
})

describe("formatDateShort", () => {
  it("returns a non-empty string", () => {
    expect(formatDateShort(new Date("2024-01-15"))).toBeTruthy()
  })

  it("includes year in output", () => {
    expect(formatDateShort("2025-12-31")).toContain("2025")
  })

  it("does not include time (no colon)", () => {
    expect(formatDateShort(new Date("2024-06-01T12:00:00"))).not.toContain(":")
  })
})
