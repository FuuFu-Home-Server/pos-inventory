import { formatRupiah, formatDate } from "@/lib/format"

export type ReceiptItem = {
  productName: string
  variantName: string
  unit: string
  qty: number
  unitPrice: number
  itemDiscountAmt: number
  subtotal: number
}

export type ReceiptData = {
  transactionId: number
  createdAt: Date | string
  cashierName: string
  customerName?: string | null
  items: ReceiptItem[]
  subtotal: number
  discountAmount: number
  total: number
  paymentAmount: number
  changeAmount: number
  paymentMethod: string
  config: {
    storeName: string
    address?: string | null
    phone?: string | null
    headerText?: string | null
    footerText?: string | null
    showTax: boolean
    showCashier: boolean
    paperWidth: number
  }
}

export function ReceiptTemplate({ data }: { data: ReceiptData }) {
  const { config } = data
  const widthClass = config.paperWidth === 58 ? "receipt-58mm" : "receipt-80mm"

  return (
    <div id="receipt-print" className={`receipt ${widthClass} font-mono text-black bg-white p-2`}>
      <div className="text-center border-b border-dashed border-black pb-2 mb-2">
        <p className="font-bold text-sm uppercase">{config.storeName}</p>
        {config.address && <p className="text-xs">{config.address}</p>}
        {config.phone && <p className="text-xs">Telp: {config.phone}</p>}
        {config.headerText && <p className="text-xs mt-1">{config.headerText}</p>}
      </div>

      <div className="text-xs mb-2 space-y-0.5">
        <div className="flex justify-between">
          <span>No. Transaksi</span>
          <span>#{String(data.transactionId).padStart(6, "0")}</span>
        </div>
        <div className="flex justify-between">
          <span>Tanggal</span>
          <span>{formatDate(data.createdAt)}</span>
        </div>
        {config.showCashier && (
          <div className="flex justify-between">
            <span>Kasir</span>
            <span>{data.cashierName}</span>
          </div>
        )}
        {data.customerName && (
          <div className="flex justify-between">
            <span>Pelanggan</span>
            <span>{data.customerName}</span>
          </div>
        )}
      </div>

      <div className="border-t border-b border-dashed border-black py-2 mb-2 space-y-1">
        {data.items.map((item, i) => (
          <div key={i} className="text-xs">
            <p className="font-medium">{item.productName} {item.variantName}</p>
            <div className="flex justify-between pl-2 text-gray-700">
              <span>{item.qty} {item.unit} × {formatRupiah(item.unitPrice)}</span>
              <span>{formatRupiah(item.subtotal)}</span>
            </div>
            {item.itemDiscountAmt > 0 && (
              <div className="flex justify-between pl-2 text-gray-500">
                <span>Diskon item</span>
                <span>-{formatRupiah(item.itemDiscountAmt)}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="text-xs space-y-0.5 mb-2">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatRupiah(data.subtotal)}</span>
        </div>
        {data.discountAmount > 0 && (
          <div className="flex justify-between">
            <span>Diskon</span>
            <span>-{formatRupiah(data.discountAmount)}</span>
          </div>
        )}
        {config.showTax && (
          <div className="flex justify-between">
            <span>PPN 11%</span>
            <span>{formatRupiah(Math.round(data.total * 0.11 / 1.11))}</span>
          </div>
        )}
        <div className="flex justify-between font-bold border-t border-dashed border-black pt-1 mt-1">
          <span>TOTAL</span>
          <span>{formatRupiah(data.total)}</span>
        </div>
        <div className="flex justify-between">
          <span>Bayar ({data.paymentMethod})</span>
          <span>{formatRupiah(data.paymentAmount)}</span>
        </div>
        {data.changeAmount > 0 && (
          <div className="flex justify-between font-medium">
            <span>Kembali</span>
            <span>{formatRupiah(data.changeAmount)}</span>
          </div>
        )}
      </div>

      {config.footerText && (
        <div className="text-center text-xs border-t border-dashed border-black pt-2">
          {config.footerText}
        </div>
      )}
    </div>
  )
}
