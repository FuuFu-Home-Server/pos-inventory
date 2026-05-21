"use client"

import { useState, useEffect, useCallback } from "react"
import { Table, Thead, Tbody, Th, Td } from "@/components/ui/Table"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { formatDate } from "@/lib/format"

type Opname = { id: number; status: string; notes: string | null; createdAt: string; user: { name: string }; _count: { items: number } }
type OpnameDetail = {
  id: number; status: string; notes: string | null; createdAt: string; user: { name: string }
  items: { id: number; systemQty: number; physicalQty: number; difference: number; productVariant: { variantName: string; unit: string; product: { name: string } } }[]
}

export default function StockOpnamePage() {
  const [opnames, setOpnames] = useState<Opname[]>([])
  const [detail, setDetail] = useState<OpnameDetail | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch("/api/stock-opname")
    const data = await res.json()
    setOpnames(data.opnames)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    if (!confirm("Buat opname baru? Semua stok sistem saat ini akan di-snapshot.")) return
    setLoading(true)
    await fetch("/api/stock-opname", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
    setLoading(false)
    load()
  }

  async function openDetail(id: number) {
    const res = await fetch(`/api/stock-opname/${id}`)
    setDetail(await res.json())
  }

  async function handleUpdateItem(opnameId: number, itemId: number, physicalQty: number) {
    await fetch(`/api/stock-opname/${opnameId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-item", itemId, physicalQty }),
    })
  }

  async function handleConfirm(id: number) {
    if (!confirm("Konfirmasi opname? Stok sistem akan diperbarui sesuai stok fisik. Tindakan ini tidak bisa dibatalkan.")) return
    await fetch(`/api/stock-opname/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "confirm" }) })
    setDetail(null)
    load()
  }

  if (detail) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <button onClick={() => setDetail(null)} className="text-sm text-blue-600 hover:underline mb-1">← Kembali</button>
            <h1 className="text-2xl font-bold text-gray-900">Detail Opname #{detail.id}</h1>
            <p className="text-sm text-gray-500">{detail.user.name} · {formatDate(detail.createdAt)}</p>
          </div>
          {detail.status === "DRAFT" && (
            <Button onClick={() => handleConfirm(detail.id)} className="bg-green-600 hover:bg-green-700">
              Konfirmasi & Update Stok
            </Button>
          )}
        </div>
        <Table>
          <Thead><tr><Th>Produk</Th><Th>Varian</Th><Th className="text-right">Stok Sistem</Th><Th className="text-right">Stok Fisik</Th><Th className="text-right">Selisih</Th></tr></Thead>
          <Tbody>
            {detail.items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <Td className="font-medium">{item.productVariant.product.name}</Td>
                <Td className="text-gray-500">{item.productVariant.variantName}</Td>
                <Td className="text-right">{item.systemQty} {item.productVariant.unit}</Td>
                <Td className="text-right">
                  {detail.status === "DRAFT" ? (
                    <input
                      type="number"
                      defaultValue={item.physicalQty}
                      min={0}
                      className="w-20 text-right border border-gray-300 rounded px-2 py-0.5 text-sm"
                      onBlur={(e) => handleUpdateItem(detail.id, item.id, Number(e.target.value))}
                    />
                  ) : (
                    <span>{item.physicalQty} {item.productVariant.unit}</span>
                  )}
                </Td>
                <Td className={`text-right font-semibold ${item.difference > 0 ? "text-green-600" : item.difference < 0 ? "text-red-600" : "text-gray-400"}`}>
                  {item.difference > 0 ? `+${item.difference}` : item.difference}
                </Td>
              </tr>
            ))}
          </Tbody>
        </Table>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Stock Opname</h1>
        <Button onClick={handleCreate} loading={loading}>+ Buat Opname Baru</Button>
      </div>
      <Table>
        <Thead><tr><Th>ID</Th><Th>Dibuat oleh</Th><Th>Tanggal</Th><Th>Item</Th><Th>Status</Th><Th /></tr></Thead>
        <Tbody>
          {opnames.map((o) => (
            <tr key={o.id} className="hover:bg-gray-50">
              <Td className="font-mono text-xs">#{o.id}</Td>
              <Td className="text-gray-500 text-xs">{o.user.name}</Td>
              <Td className="text-gray-500 text-xs">{formatDate(o.createdAt)}</Td>
              <Td className="text-gray-500">{o._count.items} variant</Td>
              <Td><Badge variant={o.status === "CONFIRMED" ? "success" : "warning"}>{o.status === "CONFIRMED" ? "Dikonfirmasi" : "Draf"}</Badge></Td>
              <Td><Button variant="secondary" className="text-xs py-1 px-2" onClick={() => openDetail(o.id)}>Detail</Button></Td>
            </tr>
          ))}
        </Tbody>
      </Table>
    </div>
  )
}
