import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"
import { Input } from "@/components/ui/Input"

describe("Input", () => {
  it("renders input element", () => {
    render(<Input />)
    expect(screen.getByRole("textbox")).toBeInTheDocument()
  })

  it("renders label when provided", () => {
    render(<Input label="Nama Produk" id="name" />)
    expect(screen.getByText("Nama Produk")).toBeInTheDocument()
  })

  it("label is associated with input via id", () => {
    render(<Input label="Email" id="email" />)
    const label = screen.getByText("Email")
    expect(label).toHaveAttribute("for", "email")
  })

  it("renders error message", () => {
    render(<Input error="Wajib diisi" />)
    expect(screen.getByText(/Wajib diisi/)).toBeInTheDocument()
  })

  it("applies error border class when error present", () => {
    render(<Input error="Error" />)
    expect(screen.getByRole("textbox")).toHaveClass("border-red-400")
  })

  it("no error class without error prop", () => {
    render(<Input />)
    expect(screen.getByRole("textbox")).not.toHaveClass("border-red-400")
  })

  it("accepts user input", async () => {
    render(<Input />)
    const input = screen.getByRole("textbox")
    await userEvent.type(input, "Beras Premium")
    expect(input).toHaveValue("Beras Premium")
  })

  it("calls onChange on type", async () => {
    const onChange = vi.fn()
    render(<Input onChange={onChange} />)
    await userEvent.type(screen.getByRole("textbox"), "a")
    expect(onChange).toHaveBeenCalled()
  })

  it("disabled input is not editable", () => {
    render(<Input disabled />)
    expect(screen.getByRole("textbox")).toBeDisabled()
  })

  it("placeholder shown", () => {
    render(<Input placeholder="Cari produk..." />)
    expect(screen.getByPlaceholderText("Cari produk...")).toBeInTheDocument()
  })
})
