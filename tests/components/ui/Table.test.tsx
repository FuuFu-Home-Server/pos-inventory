import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"
import { Table, Thead, Tbody, Th, Td } from "@/components/ui/Table"

describe("Table", () => {
  it("renders children inside table", () => {
    render(
      <Table>
        <Thead>
          <tr>
            <Th>Nama</Th>
            <Th>Harga</Th>
          </tr>
        </Thead>
        <Tbody>
          <tr>
            <Td>Beras</Td>
            <Td>10.000</Td>
          </tr>
        </Tbody>
      </Table>,
    )
    expect(screen.getByText("Nama")).toBeInTheDocument()
    expect(screen.getByText("Harga")).toBeInTheDocument()
    expect(screen.getByText("Beras")).toBeInTheDocument()
    expect(screen.getByText("10.000")).toBeInTheDocument()
  })

  it("Th renders without children", () => {
    render(
      <table>
        <thead>
          <tr>
            <Th />
          </tr>
        </thead>
      </table>,
    )
    expect(screen.getByRole("columnheader")).toBeInTheDocument()
  })

  it("Td supports colSpan", () => {
    render(
      <table>
        <tbody>
          <tr>
            <Td colSpan={3}>Kosong</Td>
          </tr>
        </tbody>
      </table>,
    )
    expect(screen.getByText("Kosong")).toHaveAttribute("colspan", "3")
  })

  it("Td calls onClick when clicked", async () => {
    const onClick = vi.fn()
    render(
      <table>
        <tbody>
          <tr>
            <Td onClick={onClick}>Klik</Td>
          </tr>
        </tbody>
      </table>,
    )
    await userEvent.click(screen.getByText("Klik"))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it("applies custom className to Table", () => {
    const { container } = render(
      <Table className="custom-table">
        <tbody />
      </Table>,
    )
    expect(container.firstChild).toHaveClass("custom-table")
  })
})
