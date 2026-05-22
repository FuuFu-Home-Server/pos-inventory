import { EscPos } from "./escpos"
import type { ReceiptData } from "@/components/receipt/ReceiptTemplate"

function rp(n: number) {
  return "Rp" + n.toLocaleString("id-ID")
}

export function buildReceiptBytes(data: ReceiptData): Uint8Array {
  const cols = data.config.paperWidth === 58 ? 32 : 42
  const p = new EscPos().init()
  const { config } = data

  p.align("center").bold(true).size(2, 2).line(config.storeName).size(1, 1).bold(false)
  if (config.address) p.line(config.address)
  if (config.phone) p.line("Telp: " + config.phone)
  if (config.headerText) p.line(config.headerText)
  p.align("left").hr(cols)

  p.cols("No.", "#" + String(data.transactionId).padStart(6, "0"), cols)
  p.cols("Tanggal", new Date(data.createdAt).toLocaleDateString("id-ID"), cols)
  if (config.showCashier) p.cols("Kasir", data.cashierName, cols)
  if (data.customerName) p.cols("Pelanggan", data.customerName, cols)
  p.hr(cols)

  for (const item of data.items) {
    p.line(item.productName + (item.variantName ? " " + item.variantName : ""))
    p.cols("  " + item.qty + " " + item.unit + " x " + rp(item.unitPrice), rp(item.subtotal), cols)
    if (item.itemDiscountAmt > 0) p.cols("  Diskon", "-" + rp(item.itemDiscountAmt), cols)
  }
  p.hr(cols)

  p.cols("Subtotal", rp(data.subtotal), cols)
  if (data.discountAmount > 0) p.cols("Diskon", "-" + rp(data.discountAmount), cols)
  if (config.showTax) {
    p.cols("PPN 11%", rp(Math.round((data.total * 0.11) / 1.11)), cols)
  }
  p.bold(true).cols("TOTAL", rp(data.total), cols).bold(false)
  p.cols("Bayar (" + data.paymentMethod + ")", rp(data.paymentAmount), cols)
  if (data.changeAmount > 0) p.cols("Kembali", rp(data.changeAmount), cols)

  if (config.footerText) {
    p.hr(cols).align("center").line(config.footerText).align("left")
  }

  p.feed(4).cut()
  return p.bytes()
}

export async function printEscPos(port: SerialPort, data: ReceiptData): Promise<void> {
  const bytes = buildReceiptBytes(data)
  const writer = port.writable!.getWriter()
  try {
    await writer.write(bytes)
  } finally {
    writer.releaseLock()
  }
}
