import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"
import { Toggle } from "@/components/ui/Toggle"

describe("Toggle", () => {
  it("renders switch role", () => {
    render(<Toggle checked={false} onChange={vi.fn()} />)
    expect(screen.getByRole("switch")).toBeInTheDocument()
  })

  it("aria-checked reflects checked prop", () => {
    render(<Toggle checked={true} onChange={vi.fn()} />)
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true")
  })

  it("aria-checked false when unchecked", () => {
    render(<Toggle checked={false} onChange={vi.fn()} />)
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false")
  })

  it("calls onChange with toggled value on click", async () => {
    const onChange = vi.fn()
    render(<Toggle checked={false} onChange={onChange} />)
    await userEvent.click(screen.getByRole("switch"))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it("calls onChange with false when currently checked", async () => {
    const onChange = vi.fn()
    render(<Toggle checked={true} onChange={onChange} />)
    await userEvent.click(screen.getByRole("switch"))
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it("renders label text", () => {
    render(<Toggle checked={false} onChange={vi.fn()} label="Aktif" />)
    expect(screen.getByText("Aktif")).toBeInTheDocument()
  })

  it("disabled prevents onChange", async () => {
    const onChange = vi.fn()
    render(<Toggle checked={false} onChange={onChange} disabled />)
    const sw = screen.getByRole("switch")
    expect(sw).toBeDisabled()
    await userEvent.click(sw)
    expect(onChange).not.toHaveBeenCalled()
  })

  it("size=sm applies small track classes", () => {
    render(<Toggle checked={false} onChange={vi.fn()} size="sm" />)
    const sw = screen.getByRole("switch")
    expect(sw).toHaveClass("w-8")
    expect(sw).toHaveClass("h-4")
  })

  it("size=md applies medium track classes (default)", () => {
    render(<Toggle checked={false} onChange={vi.fn()} size="md" />)
    const sw = screen.getByRole("switch")
    expect(sw).toHaveClass("w-10")
    expect(sw).toHaveClass("h-5")
  })
})
