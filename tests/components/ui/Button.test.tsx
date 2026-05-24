import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"
import { Button } from "@/components/ui/Button"

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Simpan</Button>)
    expect(screen.getByRole("button", { name: "Simpan" })).toBeInTheDocument()
  })

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click</Button>)
    await userEvent.click(screen.getByRole("button"))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it("disabled prevents click", async () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Disabled
      </Button>,
    )
    const btn = screen.getByRole("button")
    expect(btn).toBeDisabled()
    await userEvent.click(btn)
    expect(onClick).not.toHaveBeenCalled()
  })

  it("loading disables button and shows spinner", () => {
    render(<Button loading>Loading</Button>)
    const btn = screen.getByRole("button")
    expect(btn).toBeDisabled()
    expect(btn.querySelector(".animate-spin")).toBeInTheDocument()
  })

  it("variant=danger applies red classes", () => {
    render(<Button variant="danger">Hapus</Button>)
    expect(screen.getByRole("button")).toHaveClass("bg-red-600")
  })

  it("variant=secondary applies border classes", () => {
    render(<Button variant="secondary">Batal</Button>)
    expect(screen.getByRole("button")).toHaveClass("border")
  })

  it("size=sm applies small padding", () => {
    render(<Button size="sm">Kecil</Button>)
    expect(screen.getByRole("button")).toHaveClass("px-3")
  })

  it("size=lg applies large padding", () => {
    render(<Button size="lg">Besar</Button>)
    expect(screen.getByRole("button")).toHaveClass("px-5")
  })
})
