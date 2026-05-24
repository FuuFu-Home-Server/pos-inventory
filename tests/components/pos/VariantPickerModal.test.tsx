import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"
import { VariantPickerModal } from "@/components/pos/VariantPickerModal"

const variants = [
  {
    id: 1,
    productId: 10,
    productName: "Beras",
    variantName: "1kg",
    price: 15_000,
    stock: 20,
    unit: "kg",
    barcode: null,
  },
  {
    id: 2,
    productId: 10,
    productName: "Beras",
    variantName: "5kg",
    price: 70_000,
    stock: 5,
    unit: "kg",
    barcode: "8991",
  },
]

describe("VariantPickerModal", () => {
  it("does not render when closed", () => {
    render(
      <VariantPickerModal open={false} onClose={vi.fn()} variants={variants} onSelect={vi.fn()} />,
    )
    expect(screen.queryByText("1kg")).not.toBeInTheDocument()
  })

  it("renders all variants when open", () => {
    render(
      <VariantPickerModal open={true} onClose={vi.fn()} variants={variants} onSelect={vi.fn()} />,
    )
    expect(screen.getByText("1kg")).toBeInTheDocument()
    expect(screen.getByText("5kg")).toBeInTheDocument()
  })

  it("shows formatted price and unit", () => {
    render(
      <VariantPickerModal open={true} onClose={vi.fn()} variants={variants} onSelect={vi.fn()} />,
    )
    expect(screen.getByText(/Rp 15\.000/)).toBeInTheDocument()
    expect(screen.getByText(/Rp 70\.000/)).toBeInTheDocument()
  })

  it("calls onSelect with correct variant and onClose when variant clicked", async () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(
      <VariantPickerModal open={true} onClose={onClose} variants={variants} onSelect={onSelect} />,
    )
    await userEvent.click(screen.getByText("1kg"))
    expect(onSelect).toHaveBeenCalledWith(variants[0])
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("renders title 'Pilih Varian'", () => {
    render(
      <VariantPickerModal open={true} onClose={vi.fn()} variants={variants} onSelect={vi.fn()} />,
    )
    expect(screen.getByText("Pilih Varian")).toBeInTheDocument()
  })
})
