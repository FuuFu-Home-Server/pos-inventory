import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"
import { Select } from "@/components/ui/Select"

const options = [
  { value: "admin", label: "Admin" },
  { value: "employee", label: "Karyawan" },
  { value: "owner", label: "Pemilik" },
]

describe("Select", () => {
  it("renders placeholder when no value", () => {
    render(<Select value="" onChange={vi.fn()} options={options} placeholder="Pilih role" />)
    expect(screen.getByText("Pilih role")).toBeInTheDocument()
  })

  it("renders selected label", () => {
    render(<Select value="admin" onChange={vi.fn()} options={options} />)
    expect(screen.getByText("Admin")).toBeInTheDocument()
  })

  it("renders label prop", () => {
    render(<Select value="" onChange={vi.fn()} options={options} label="Role" />)
    expect(screen.getByText("Role")).toBeInTheDocument()
  })

  it("renders error message", () => {
    render(<Select value="" onChange={vi.fn()} options={options} error="Wajib diisi" />)
    expect(screen.getByText("Wajib diisi")).toBeInTheDocument()
  })

  it("opens dropdown on click", async () => {
    render(<Select value="" onChange={vi.fn()} options={options} />)
    await userEvent.click(screen.getByRole("button"))
    expect(screen.getByRole("listbox")).toBeInTheDocument()
    expect(screen.getByText("Admin")).toBeInTheDocument()
    expect(screen.getByText("Karyawan")).toBeInTheDocument()
  })

  it("calls onChange when option selected", async () => {
    const onChange = vi.fn()
    render(<Select value="" onChange={onChange} options={options} />)
    await userEvent.click(screen.getByRole("button"))
    fireEvent.mouseDown(screen.getByText("Karyawan"))
    expect(onChange).toHaveBeenCalledWith("employee")
  })

  it("disabled button is not clickable", async () => {
    const onChange = vi.fn()
    render(<Select value="" onChange={onChange} options={options} disabled />)
    const btn = screen.getByRole("button")
    expect(btn).toBeDisabled()
    await userEvent.click(btn)
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
  })

  it("shows empty state when options array is empty", async () => {
    render(<Select value="" onChange={vi.fn()} options={[]} />)
    await userEvent.click(screen.getByRole("button"))
    expect(screen.getByText("Tidak ada pilihan")).toBeInTheDocument()
  })

  it("opens with keyboard Enter", async () => {
    render(<Select value="" onChange={vi.fn()} options={options} />)
    const btn = screen.getByRole("button")
    btn.focus()
    fireEvent.keyDown(btn, { key: "Enter" })
    expect(screen.getByRole("listbox")).toBeInTheDocument()
  })

  it("closes with Escape key", async () => {
    render(<Select value="" onChange={vi.fn()} options={options} />)
    await userEvent.click(screen.getByRole("button"))
    expect(screen.getByRole("listbox")).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole("button"), { key: "Escape" })
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
  })

  it("ArrowDown + Enter selects option", async () => {
    const onChange = vi.fn()
    render(<Select value="" onChange={onChange} options={options} />)
    const btn = screen.getByRole("button")
    await userEvent.click(btn)
    fireEvent.keyDown(btn, { key: "ArrowDown" })
    fireEvent.keyDown(btn, { key: "Enter" })
    expect(onChange).toHaveBeenCalledWith(options[1].value)
  })

  it("ArrowUp navigates up in list", async () => {
    const onChange = vi.fn()
    render(<Select value="owner" onChange={onChange} options={options} />)
    const btn = screen.getByRole("button")
    await userEvent.click(btn)
    fireEvent.keyDown(btn, { key: "ArrowDown" })
    fireEvent.keyDown(btn, { key: "ArrowUp" })
    fireEvent.keyDown(btn, { key: "Enter" })
    expect(onChange).toHaveBeenCalled()
  })

  it("Space key opens dropdown", () => {
    render(<Select value="" onChange={vi.fn()} options={options} />)
    const btn = screen.getByRole("button")
    btn.focus()
    fireEvent.keyDown(btn, { key: " " })
    expect(screen.getByRole("listbox")).toBeInTheDocument()
  })
})
