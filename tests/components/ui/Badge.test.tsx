import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { Badge } from "@/components/ui/Badge"

describe("Badge", () => {
  it("renders children", () => {
    render(<Badge>Aktif</Badge>)
    expect(screen.getByText("Aktif")).toBeInTheDocument()
  })

  it("default variant renders", () => {
    const { container } = render(<Badge>X</Badge>)
    expect(container.firstChild).toBeInTheDocument()
  })

  it("applies variant classes", () => {
    const { container } = render(<Badge variant="success">Sukses</Badge>)
    expect(container.firstChild).toHaveClass("text-emerald-700")
  })

  it("applies danger variant", () => {
    const { container } = render(<Badge variant="danger">Error</Badge>)
    expect(container.firstChild).toHaveClass("text-red-700")
  })

  it("applies warning variant", () => {
    const { container } = render(<Badge variant="warning">Warning</Badge>)
    expect(container.firstChild).toHaveClass("text-amber-700")
  })

  it("merges custom className", () => {
    const { container } = render(<Badge className="custom-class">X</Badge>)
    expect(container.firstChild).toHaveClass("custom-class")
  })
})
