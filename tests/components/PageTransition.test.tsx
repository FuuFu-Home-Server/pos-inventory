import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }))

import { PageTransition } from "@/components/PageTransition"

describe("PageTransition", () => {
  it("renders children", () => {
    render(
      <PageTransition>
        <p>Konten</p>
      </PageTransition>,
    )
    expect(screen.getByText("Konten")).toBeInTheDocument()
  })

  it("applies animate-page-in class", () => {
    const { container } = render(
      <PageTransition>
        <p>X</p>
      </PageTransition>,
    )
    expect(container.firstChild).toHaveClass("animate-page-in")
  })

  it("merges custom className", () => {
    const { container } = render(
      <PageTransition className="custom-cls">
        <p>X</p>
      </PageTransition>,
    )
    expect(container.firstChild).toHaveClass("custom-cls")
    expect(container.firstChild).toHaveClass("animate-page-in")
  })

  it("uses pathname as key (no crash)", () => {
    expect(() =>
      render(
        <PageTransition>
          <span>Test</span>
        </PageTransition>,
      ),
    ).not.toThrow()
  })
})
