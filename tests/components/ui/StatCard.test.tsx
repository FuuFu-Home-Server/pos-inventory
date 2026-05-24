import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { StatCard } from "@/components/ui/StatCard"

describe("StatCard", () => {
  it("renders label and value", () => {
    render(<StatCard label="Total Produk" value={42} />)
    expect(screen.getByText("Total Produk")).toBeInTheDocument()
    expect(screen.getByText("42")).toBeInTheDocument()
  })

  it("renders string value", () => {
    render(<StatCard label="Omset" value="Rp 1.000.000" />)
    expect(screen.getByText("Rp 1.000.000")).toBeInTheDocument()
  })

  it("renders sub text when provided", () => {
    render(<StatCard label="Stok" value={10} sub="unit tersisa" />)
    expect(screen.getByText("unit tersisa")).toBeInTheDocument()
  })

  it("does not render sub when omitted", () => {
    render(<StatCard label="X" value={0} />)
    expect(screen.queryByText("unit tersisa")).not.toBeInTheDocument()
  })

  it("renders icon slot", () => {
    render(<StatCard label="X" value={1} icon={<span data-testid="icon" />} />)
    expect(screen.getByTestId("icon")).toBeInTheDocument()
  })

  it("warning variant applies amber classes", () => {
    const { container } = render(<StatCard label="X" value={1} variant="warning" />)
    expect(container.firstChild).toHaveClass("border-amber-200")
  })

  it("danger variant applies red classes", () => {
    const { container } = render(<StatCard label="X" value={1} variant="danger" />)
    expect(container.firstChild).toHaveClass("border-red-100")
  })

  it("success variant applies emerald classes", () => {
    const { container } = render(<StatCard label="X" value={1} variant="success" />)
    expect(container.firstChild).toHaveClass("border-emerald-100")
  })

  it("renders icon with sub text", () => {
    render(<StatCard label="Stok" value={5} icon={<span data-testid="ic" />} sub="unit rendah" />)
    expect(screen.getByTestId("ic")).toBeInTheDocument()
    expect(screen.getByText("unit rendah")).toBeInTheDocument()
  })
})
