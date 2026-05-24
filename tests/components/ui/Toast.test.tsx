import { render, screen, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { Toast } from "@/components/ui/Toast"

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders message", () => {
    render(<Toast message="Berhasil disimpan" onDismiss={vi.fn()} />)
    expect(screen.getByText("Berhasil disimpan")).toBeInTheDocument()
  })

  it("success type applies green class", () => {
    const { container } = render(<Toast message="OK" type="success" onDismiss={vi.fn()} />)
    expect(container.firstChild).toHaveClass("bg-green-600")
  })

  it("error type applies red class", () => {
    const { container } = render(<Toast message="Gagal" type="error" onDismiss={vi.fn()} />)
    expect(container.firstChild).toHaveClass("bg-red-600")
  })

  it("info type is default and applies blue class", () => {
    const { container } = render(<Toast message="Info" onDismiss={vi.fn()} />)
    expect(container.firstChild).toHaveClass("bg-blue-600")
  })

  it("calls onDismiss after default duration (3000ms)", () => {
    const onDismiss = vi.fn()
    render(<Toast message="X" onDismiss={onDismiss} />)
    expect(onDismiss).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it("calls onDismiss after custom duration", () => {
    const onDismiss = vi.fn()
    render(<Toast message="X" onDismiss={onDismiss} duration={1000} />)
    act(() => {
      vi.advanceTimersByTime(999)
    })
    expect(onDismiss).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
