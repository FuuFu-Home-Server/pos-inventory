import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

import { ServerStatusCard } from "@/components/dashboard/ServerStatusCard"

describe("ServerStatusCard", () => {
  it("shows Online status (default — no electronAPI in jsdom)", () => {
    render(<ServerStatusCard />)
    expect(screen.getByText("Online")).toBeInTheDocument()
  })

  it("shows Toko label", () => {
    render(<ServerStatusCard />)
    expect(screen.getByText("Toko")).toBeInTheDocument()
  })

  it("links to /dashboard/settings", () => {
    render(<ServerStatusCard />)
    expect(screen.getByRole("link")).toHaveAttribute("href", "/dashboard/settings")
  })

  it("shows connected message when online", () => {
    render(<ServerStatusCard />)
    expect(screen.getByText("terhubung ke server")).toBeInTheDocument()
  })
})
