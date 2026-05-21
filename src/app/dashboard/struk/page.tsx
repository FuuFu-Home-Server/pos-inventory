"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { ReceiptTemplate } from "@/components/receipt/ReceiptTemplate"
import type { ReceiptData } from "@/components/receipt/ReceiptTemplate"

type Config = {
  storeName: string
  address: string | null
  phone: string | null
  headerText: string | null
  footerText: string | null
  showTax: boolean
  showCashier: boolean
  paperWidth: number
}

const PREVIEW_DATA: ReceiptData = {
  transactionId: 1,
  createdAt: new Date().toISOString(),
  cashierName: "Budi Santoso",
  customerName: "Ibu Dewi",
  items: [
    {
      productName: "Beras",
      variantName: "5kg",
      unit: "karung",
      qty: 2,
      unitPrice: 62000,
      itemDiscountAmt: 0,
      subtotal: 124000,
    },
    {
      productName: "Gula Pasir",
      variantName: "1kg",
      unit: "kg",
      qty: 1,
      unitPrice: 14000,
      itemDiscountAmt: 0,
      subtotal: 14000,
    },
  ],
  subtotal: 138000,
  discountAmount: 0,
  total: 138000,
  paymentAmount: 150000,
  changeAmount: 12000,
  paymentMethod: "TUNAI",
  config: {
    storeName: "",
    address: null,
    phone: null,
    headerText: null,
    footerText: null,
    showTax: false,
    showCashier: true,
    paperWidth: 80,
  },
}

export default function StrukPage() {
  const [config, setConfig] = useState<Config>({
    storeName: "",
    address: null,
    phone: null,
    headerText: null,
    footerText: null,
    showTax: false,
    showCashier: true,
    paperWidth: 80,
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch("/api/receipt-config")
      .then((r) => r.json())
      .then(setConfig)
  }, [])

  async function handleSave() {
    setLoading(true)
    await fetch("/api/receipt-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    })
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const previewData = { ...PREVIEW_DATA, config }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Konfigurasi Struk</h1>
      <div className="flex gap-6">
        <div className="flex-1 space-y-4 max-w-md">
          <Input
            label="Nama Toko"
            value={config.storeName}
            onChange={(e) => setConfig({ ...config, storeName: e.target.value })}
          />
          <Input
            label="Alamat"
            value={config.address ?? ""}
            onChange={(e) => setConfig({ ...config, address: e.target.value || null })}
          />
          <Input
            label="Nomor Telepon"
            value={config.phone ?? ""}
            onChange={(e) => setConfig({ ...config, phone: e.target.value || null })}
          />
          <Input
            label="Teks Header"
            value={config.headerText ?? ""}
            onChange={(e) => setConfig({ ...config, headerText: e.target.value || null })}
            placeholder="Misal: Selamat Berbelanja!"
          />
          <Input
            label="Teks Footer"
            value={config.footerText ?? ""}
            onChange={(e) => setConfig({ ...config, footerText: e.target.value || null })}
            placeholder="Misal: Terima kasih!"
          />
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.showTax}
                onChange={(e) => setConfig({ ...config, showTax: e.target.checked })}
              />
              Tampilkan PPN
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.showCashier}
                onChange={(e) => setConfig({ ...config, showCashier: e.target.checked })}
              />
              Tampilkan Nama Kasir
            </label>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Lebar Kertas</label>
            <div className="flex gap-3 mt-1">
              {[58, 80].map((w) => (
                <button
                  key={w}
                  onClick={() => setConfig({ ...config, paperWidth: w })}
                  className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors ${config.paperWidth === w ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}
                >
                  {w}mm
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handleSave} loading={loading} className="w-full">
            {saved ? "✓ Tersimpan" : "Simpan Konfigurasi"}
          </Button>
        </div>
        <div className="shrink-0">
          <p className="text-sm font-medium text-gray-500 mb-3">Preview Struk</p>
          <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
            <ReceiptTemplate data={previewData} />
          </div>
        </div>
      </div>
    </div>
  )
}
