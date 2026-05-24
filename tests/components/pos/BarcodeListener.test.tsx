import { render, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { BarcodeListener } from "@/components/pos/BarcodeListener"

function pressKeys(keys: string[]) {
  keys.forEach((key) => fireEvent.keyDown(window, { key }))
}

describe("BarcodeListener", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("fires onScan after 4+ chars + Enter", () => {
    const onScan = vi.fn()
    render(<BarcodeListener onScan={onScan} />)
    pressKeys(["8", "9", "9", "1", "Enter"])
    expect(onScan).toHaveBeenCalledWith("8991")
  })

  it("fires onScan after 4+ chars + Tab", () => {
    const onScan = vi.fn()
    render(<BarcodeListener onScan={onScan} />)
    pressKeys(["A", "B", "C", "D", "Tab"])
    expect(onScan).toHaveBeenCalledWith("ABCD")
  })

  it("does not fire if buffer < 4 chars", () => {
    const onScan = vi.fn()
    render(<BarcodeListener onScan={onScan} />)
    pressKeys(["1", "2", "3", "Enter"])
    expect(onScan).not.toHaveBeenCalled()
  })

  it("does not fire when active=false", () => {
    const onScan = vi.fn()
    render(<BarcodeListener onScan={onScan} active={false} />)
    pressKeys(["8", "9", "9", "1", "Enter"])
    expect(onScan).not.toHaveBeenCalled()
  })

  it("ignores keys typed into INPUT elements", () => {
    const onScan = vi.fn()
    render(<BarcodeListener onScan={onScan} />)
    const input = document.createElement("input")
    document.body.appendChild(input)
    ;["8", "9", "9", "1", "Enter"].forEach((key) => fireEvent.keyDown(input, { key }))
    expect(onScan).not.toHaveBeenCalled()
    document.body.removeChild(input)
  })

  it("buffer resets after 50ms timeout", () => {
    const onScan = vi.fn()
    render(<BarcodeListener onScan={onScan} />)
    pressKeys(["8", "9", "9"])
    vi.advanceTimersByTime(51)
    pressKeys(["1", "Enter"])
    expect(onScan).not.toHaveBeenCalled()
  })

  it("trims whitespace from scanned barcode", () => {
    const onScan = vi.fn()
    render(<BarcodeListener onScan={onScan} />)
    pressKeys([" ", "8", "9", "9", "1", "Enter"])
    expect(onScan).toHaveBeenCalledWith("8991")
  })

  it("renders null (no DOM output)", () => {
    const { container } = render(<BarcodeListener onScan={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it("ignores multi-char keys (Shift, Control, etc.)", () => {
    const onScan = vi.fn()
    render(<BarcodeListener onScan={onScan} />)
    fireEvent.keyDown(window, { key: "Shift" })
    fireEvent.keyDown(window, { key: "8" })
    fireEvent.keyDown(window, { key: "9" })
    fireEvent.keyDown(window, { key: "9" })
    fireEvent.keyDown(window, { key: "1" })
    fireEvent.keyDown(window, { key: "Enter" })
    expect(onScan).toHaveBeenCalledWith("8991")
  })
})
