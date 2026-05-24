import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"
import { Modal } from "@/components/ui/Modal"

describe("Modal", () => {
  it("does not render when closed", () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Test">
        <p>Content</p>
      </Modal>,
    )
    expect(screen.queryByText("Content")).not.toBeInTheDocument()
  })

  it("renders when open", () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Judul Modal">
        <p>Isi Modal</p>
      </Modal>,
    )
    expect(screen.getByText("Isi Modal")).toBeInTheDocument()
    expect(screen.getByText("Judul Modal")).toBeInTheDocument()
  })

  it("calls onClose when X button clicked", async () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>,
    )
    const closeBtn = screen.getAllByRole("button")[0]
    await userEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("calls onClose when backdrop clicked", async () => {
    const onClose = vi.fn()
    const { container } = render(
      <Modal open={true} onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>,
    )
    const backdrop = container.querySelector(".absolute.inset-0")!
    await userEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("calls onClose on Escape key", () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>,
    )
    fireEvent.keyDown(window, { key: "Escape" })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("does not call onClose on other keys", () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>,
    )
    fireEvent.keyDown(window, { key: "Enter" })
    expect(onClose).not.toHaveBeenCalled()
  })
})
