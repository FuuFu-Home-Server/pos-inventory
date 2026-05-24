import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"
import { Pagination } from "@/components/ui/Pagination"

const defaults = {
  page: 1,
  total: 100,
  pageSize: 10,
  onPageChange: vi.fn(),
  onPageSizeChange: vi.fn(),
}

describe("Pagination", () => {
  it("shows page info", () => {
    render(<Pagination {...defaults} />)
    expect(screen.getByText(/1–10 dari 100/)).toBeInTheDocument()
  })

  it("shows current page and total pages", () => {
    render(<Pagination {...defaults} />)
    expect(screen.getByText("1 / 10")).toBeInTheDocument()
  })

  it("prev buttons disabled on first page", () => {
    render(<Pagination {...defaults} page={1} />)
    const buttons = screen.getAllByRole("button")
    const prevFirst = buttons.find((b) => b.textContent === "«")!
    const prevOne = buttons.find((b) => b.textContent === "‹")!
    expect(prevFirst).toBeDisabled()
    expect(prevOne).toBeDisabled()
  })

  it("next buttons disabled on last page", () => {
    render(<Pagination {...defaults} page={10} />)
    const buttons = screen.getAllByRole("button")
    const nextOne = buttons.find((b) => b.textContent === "›")!
    const nextLast = buttons.find((b) => b.textContent === "»")!
    expect(nextOne).toBeDisabled()
    expect(nextLast).toBeDisabled()
  })

  it("calls onPageChange with next page", async () => {
    const onPageChange = vi.fn()
    render(<Pagination {...defaults} page={3} onPageChange={onPageChange} />)
    const nextBtn = screen.getAllByRole("button").find((b) => b.textContent === "›")!
    await userEvent.click(nextBtn)
    expect(onPageChange).toHaveBeenCalledWith(4)
  })

  it("calls onPageChange with prev page", async () => {
    const onPageChange = vi.fn()
    render(<Pagination {...defaults} page={5} onPageChange={onPageChange} />)
    const prevBtn = screen.getAllByRole("button").find((b) => b.textContent === "‹")!
    await userEvent.click(prevBtn)
    expect(onPageChange).toHaveBeenCalledWith(4)
  })

  it("calls onPageChange(1) on first-page button", async () => {
    const onPageChange = vi.fn()
    render(<Pagination {...defaults} page={5} onPageChange={onPageChange} />)
    const firstBtn = screen.getAllByRole("button").find((b) => b.textContent === "«")!
    await userEvent.click(firstBtn)
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it("calls onPageChange(totalPages) on last-page button", async () => {
    const onPageChange = vi.fn()
    render(
      <Pagination {...defaults} page={2} onPageChange={onPageChange} total={100} pageSize={10} />,
    )
    const lastBtn = screen.getAllByRole("button").find((b) => b.textContent === "»")!
    await userEvent.click(lastBtn)
    expect(onPageChange).toHaveBeenCalledWith(10)
  })

  it("page size buttons call onPageSizeChange and reset to page 1", async () => {
    const onPageSizeChange = vi.fn()
    const onPageChange = vi.fn()
    render(
      <Pagination
        {...defaults}
        page={3}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />,
    )
    const sizeBtn = screen.getByText("20")
    await userEvent.click(sizeBtn)
    expect(onPageSizeChange).toHaveBeenCalledWith(20)
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it("shows 0-0 when total is 0", () => {
    render(<Pagination {...defaults} total={0} />)
    expect(screen.getByText(/0–0 dari 0/)).toBeInTheDocument()
  })
})
