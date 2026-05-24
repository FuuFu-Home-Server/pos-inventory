import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"
import { QrisModal } from "@/components/pos/QrisModal"

const defaults = {
  qrString: "QRIS_STRING_TEST",
  total: 50_000,
  onConfirm: vi.fn().mockResolvedValue(undefined),
  onCancel: vi.fn(),
  loading: false,
}

describe("QrisModal", () => {
  it("renders formatted total", () => {
    render(<QrisModal {...defaults} />)
    expect(screen.getByText(/Rp 50\.000/)).toBeInTheDocument()
  })

  it("renders QR code when qrString provided and not offline", () => {
    render(<QrisModal {...defaults} />)
    expect(document.querySelector("svg")).toBeInTheDocument()
  })

  it("shows offline fallback when isOffline=true and no staticQrisImage", () => {
    render(<QrisModal {...defaults} qrString="" isOffline={true} staticQrisImage={null} />)
    expect(screen.getByText(/Upload gambar QRIS statis/i)).toBeInTheDocument()
  })

  it("shows static image when isOffline=true and staticQrisImage provided", () => {
    render(<QrisModal {...defaults} isOffline={true} staticQrisImage="data:image/png;base64,abc" />)
    expect(document.querySelector("img")).toBeInTheDocument()
  })

  it("calls onCancel when Batal button clicked", async () => {
    const onCancel = vi.fn()
    render(<QrisModal {...defaults} onCancel={onCancel} />)
    await userEvent.click(screen.getByText("Batal"))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it("calls onConfirm when confirm button clicked", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(<QrisModal {...defaults} onConfirm={onConfirm} />)
    await userEvent.click(screen.getByText(/Konfirmasi/i))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it("confirm button disabled when loading=true", () => {
    render(<QrisModal {...defaults} loading={true} />)
    expect(screen.getByText("Memproses...").closest("button")).toBeDisabled()
  })

  it("shows payment method labels", () => {
    render(<QrisModal {...defaults} />)
    expect(screen.getByText(/GoPay/)).toBeInTheDocument()
  })

  it("shows env hint when qrString empty and not offline", () => {
    render(<QrisModal {...defaults} qrString="" isOffline={false} staticQrisImage={null} />)
    expect(screen.getByText(/Set NEXT_PUBLIC_QRIS_STRING/i)).toBeInTheDocument()
  })
})
