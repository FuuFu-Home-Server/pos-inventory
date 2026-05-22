"use client"

import React, { useRef, useState } from "react"
import { Table, Thead, Tbody, Th, Td } from "@/components/ui/Table"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Toggle } from "@/components/ui/Toggle"
import { Modal } from "@/components/ui/Modal"
import { formatRupiah } from "@/lib/format"
import { ChevronDown, Package, Activity, AlertTriangle } from "lucide-react"
import { Pagination } from "@/components/ui/Pagination"
import {
  useProducts,
  blankVariantRow,
  type EditVariantRow,
  type Option,
  type Product,
} from "./useProducts"

export default function ProdukPage() {
  const {
    products,
    total,
    page,
    setPage,
    pageSize,
    setPageSize,
    stats,
    search,
    setSearch,
    suppliers,
    categories,
    units,
    createOpen,
    setCreateOpen,
    editingProduct,
    setEditingProduct,
    expandedIds,
    loading,
    createForm,
    setCreateForm,
    editForm,
    setEditForm,
    openEdit,
    handleCreate,
    handleSaveEdit,
    handleDelete,
    toggleExpand,
    toggleVariantActive,
    filterCategory,
    setFilterCategory,
    filterSupplierId,
    setFilterSupplierId,
    filterStockStatus,
    setFilterStockStatus,
    filterDataStatus,
    setFilterDataStatus,
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
  } = useProducts()

  function isIncomplete(p: Product): boolean {
    return p.category === "" || p.variants.some((v) => v.isActive && v.price === 0)
  }

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    created: number
    updated: number
    errors: string[]
  } | null>(null)
  const [csvData, setCsvData] = useState<{
    headers: string[]
    rows: string[][]
    preview: string[][]
  } | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})

  const REQUIRED_FIELDS = ["name", "price"]
  const ALL_FIELDS: { key: string; label: string; required: boolean }[] = [
    { key: "name", label: "Nama Produk", required: true },
    { key: "price", label: "Harga Jual", required: true },
    { key: "category", label: "Kategori", required: false },
    { key: "variantName", label: "Nama Varian", required: false },
    { key: "barcode", label: "Barcode", required: false },
    { key: "costPrice", label: "Harga Beli", required: false },
    { key: "stock", label: "Stok", required: false },
    { key: "unit", label: "Satuan", required: false },
    { key: "lowStockThreshold", label: "Min. Stok", required: false },
  ]

  function parseCsvText(text: string): { headers: string[]; rows: string[][] } {
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean)
    function splitLine(line: string): string[] {
      const parts: string[] = []
      let cur = "",
        inQuote = false
      for (const ch of line) {
        if (ch === '"') {
          inQuote = !inQuote
        } else if (ch === "," && !inQuote) {
          parts.push(cur.trim())
          cur = ""
        } else {
          cur += ch
        }
      }
      parts.push(cur.trim())
      return parts
    }
    const headers = splitLine(lines[0])
    const rows = lines.slice(1).map(splitLine)
    return { headers, rows }
  }

  function autoMap(headers: string[]): Record<string, string> {
    const aliases: Record<string, string[]> = {
      name: ["name", "nama", "produk", "barang", "item", "namabarang", "namaitem"],
      price: ["price", "harga", "hargajual", "sell", "jual"],
      category: ["category", "kategori", "cat", "grup", "group", "jenis"],
      variantName: ["variantname", "varian", "variant", "tipe", "type", "size", "ukuran", "isian"],
      barcode: ["barcode", "kode", "ean", "upc", "scan", "kodebarang", "kodelain"],
      costPrice: ["costprice", "hargabeli", "beli", "cost", "hpp", "modal"],
      stock: ["stock", "stok", "qty", "quantity", "jumlah"],
      unit: ["unit", "satuan", "uom", "kemasan"],
      lowStockThreshold: ["lowstockthreshold", "minstok", "minimum", "batas", "threshold"],
    }
    const result: Record<string, string> = {}
    for (const [field, aliasList] of Object.entries(aliases)) {
      const match = headers.find((h) => aliasList.includes(h.toLowerCase().replace(/[^a-z]/g, "")))
      if (match) result[field] = match
    }
    return result
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const { headers, rows } = parseCsvText(text)
      setCsvData({ headers, rows, preview: rows.slice(0, 3) })
      setMapping(autoMap(headers))
    }
    reader.readAsText(file)
  }

  async function handleConfirmImport() {
    if (!csvData) return
    const missing = REQUIRED_FIELDS.filter((f) => !mapping[f])
    if (missing.length) return
    setImporting(true)
    const res = await fetch("/api/products/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ headers: csvData.headers, rows: csvData.rows, mapping }),
    })
    const data = await res.json()
    setImporting(false)
    setCsvData(null)
    setImportResult(data)
    if (res.ok) window.location.reload()
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-wrap justify-between items-start gap-3 mb-5">
        <div>
          <h1 className="text-xl font-black md:text-2xl text-gray-900">Produk</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} produk terdaftar</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            Import CSV
          </Button>
          <Button onClick={() => setCreateOpen(true)}>+ Tambah Produk</Button>
        </div>
      </div>

      {importResult && (
        <div
          className={`mb-5 border rounded-xl p-4 text-sm ${importResult.errors?.length && !importResult.created && !importResult.updated ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}
        >
          <div className="flex justify-between items-start">
            <div>
              {(importResult.created > 0 || importResult.updated > 0) && (
                <p className="font-semibold text-emerald-800">
                  {importResult.created} varian ditambah · {importResult.updated} diperbarui
                </p>
              )}
              {importResult.errors?.length > 0 && (
                <div className="mt-1">
                  <p className="font-semibold text-red-700">{importResult.errors.length} error:</p>
                  <ul className="mt-1 space-y-0.5 text-red-600 text-xs list-disc list-inside max-h-24 overflow-y-auto">
                    {importResult.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <button
              onClick={() => setImportResult(null)}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none ml-4"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
            <Package size={16} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Produk</p>
            <p className="text-base font-black text-gray-900 tabular-nums md:text-xl">{total}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
            <Activity size={16} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Varian Aktif</p>
            <p className="text-base font-black text-gray-900 tabular-nums md:text-xl">
              {stats.activeVariants}
            </p>
          </div>
        </div>
        <div
          className={`border rounded-xl p-4 flex items-center gap-3 ${stats.lowStockCount > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200"}`}
        >
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${stats.lowStockCount > 0 ? "bg-amber-100" : "bg-gray-100"}`}
          >
            <AlertTriangle
              size={16}
              className={stats.lowStockCount > 0 ? "text-amber-600" : "text-gray-400"}
            />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Stok Menipis</p>
            <p
              className={`text-base font-black tabular-nums md:text-xl ${stats.lowStockCount > 0 ? "text-amber-700" : "text-gray-900"}`}
            >
              {stats.lowStockCount}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Cari produk..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">Semua Kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={filterSupplierId}
          onChange={(e) => setFilterSupplierId(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">Semua Supplier</option>
          {suppliers.map((s) => (
            <option key={s.id} value={String(s.id)}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          value={filterStockStatus}
          onChange={(e) => setFilterStockStatus(e.target.value as "all" | "low" | "out")}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="all">Semua Stok</option>
          <option value="low">Stok Menipis</option>
          <option value="out">Stok Habis</option>
        </select>

        <select
          value={filterDataStatus}
          onChange={(e) => setFilterDataStatus(e.target.value as "all" | "incomplete")}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="all">Semua Data</option>
          <option value="incomplete">
            Data Tidak Lengkap{stats.incompleteCount > 0 ? ` (${stats.incompleteCount})` : ""}
          </option>
        </select>

        <div className="flex items-center gap-1 ml-auto">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "name" | "category" | "createdAt")}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="name">Urut: Nama</option>
            <option value="category">Urut: Kategori</option>
            <option value="createdAt">Urut: Terbaru</option>
          </select>
          <button
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white hover:bg-gray-50 text-gray-600 text-sm"
            title={sortDir === "asc" ? "A→Z / Lama→Baru" : "Z→A / Baru→Lama"}
          >
            {sortDir === "asc" ? "↑" : "↓"}
          </button>
        </div>
      </div>

      {stats.incompleteCount > 0 && filterDataStatus !== "incomplete" && (
        <div className="flex items-center gap-2 mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-amber-800">
          <AlertTriangle size={15} className="text-amber-600 shrink-0" />
          <span>
            <span className="font-bold">{stats.incompleteCount} produk</span> dengan data tidak
            lengkap (kategori kosong atau harga Rp 0).{" "}
          </span>
          <button
            onClick={() => setFilterDataStatus("incomplete")}
            className="ml-auto font-semibold underline hover:no-underline shrink-0"
          >
            Tampilkan
          </button>
        </div>
      )}

      <Table>
        <Thead>
          <tr>
            <Th>Nama Produk</Th>
            <Th>Kategori / Barcode</Th>
            <Th>Supplier / Harga</Th>
            <Th>Stok</Th>
            <Th>Status</Th>
            <Th />
          </tr>
        </Thead>
        <Tbody>
          {products.map((p) => {
            const expanded = expandedIds.has(p.id)
            const activeCount = p.variants.filter((v) => v.isActive).length
            return (
              <React.Fragment key={p.id}>
                <tr
                  className="hover:bg-gray-50 cursor-pointer select-none"
                  onClick={() => toggleExpand(p.id)}
                >
                  <Td>
                    <div className="flex items-center gap-2">
                      <ChevronDown
                        size={14}
                        className={`text-gray-400 transition-transform duration-150 shrink-0 ${expanded ? "rotate-180" : ""}`}
                      />
                      <span className="font-semibold text-gray-900">{p.name}</span>
                      {isIncomplete(p) && (
                        <span title="Data tidak lengkap: kategori kosong atau harga Rp 0">
                          <AlertTriangle size={12} className="inline ml-1 text-amber-500" />
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <Badge>{p.category}</Badge>
                  </Td>
                  <Td className="text-gray-500 text-sm">{p.supplier?.name ?? "—"}</Td>
                  <Td colSpan={2}>
                    <span className="text-xs text-gray-400">
                      {activeCount} aktif · {p.variants.length} varian
                    </span>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(p.id)}>
                        Hapus
                      </Button>
                    </div>
                  </Td>
                </tr>

                {expanded &&
                  p.variants.map((v, vi) => (
                    <tr
                      key={`${p.id}-v-${v.id}`}
                      className={`bg-gray-50/60 ${!v.isActive ? "opacity-50" : ""} ${vi === p.variants.length - 1 ? "border-b-2 border-gray-200" : ""}`}
                    >
                      <Td className="pl-10">
                        <div className="flex items-center gap-1.5 text-sm text-gray-700">
                          <span className="text-gray-300 text-base leading-none">└</span>
                          <span className="font-medium">{v.variantName}</span>
                        </div>
                      </Td>
                      <Td className="text-xs">
                        {v.barcode ? (
                          <span className="font-mono bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
                            {v.barcode}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </Td>
                      <Td className="text-sm text-gray-600 tabular-nums">
                        {formatRupiah(Number(v.price))}
                        <span className="text-gray-400 text-xs">/{v.unit}</span>
                      </Td>
                      <Td>
                        <Badge
                          variant={
                            v.stock === 0
                              ? "danger"
                              : v.stock <= v.lowStockThreshold
                                ? "warning"
                                : "success"
                          }
                        >
                          {v.stock} {v.unit}
                        </Badge>
                      </Td>
                      <Td>
                        <Toggle
                          checked={v.isActive}
                          onChange={() => toggleVariantActive(p, v.id)}
                          label={v.isActive ? "Aktif" : "Nonaktif"}
                          size="sm"
                        />
                      </Td>
                      <Td />
                    </tr>
                  ))}
              </React.Fragment>
            )
          })}
        </Tbody>
      </Table>

      <Pagination
        page={page}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tambah Produk"
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nama Produk"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            />
            <Select
              label="Kategori"
              value={createForm.category}
              onChange={(v) => setCreateForm({ ...createForm, category: v })}
              options={categories.map((c) => ({ value: c.name, label: c.name }))}
              placeholder="Pilih kategori"
            />
          </div>
          <Select
            label="Supplier"
            value={createForm.supplierId}
            onChange={(v) => setCreateForm({ ...createForm, supplierId: v })}
            options={suppliers.map((s) => ({ value: String(s.id), label: s.name }))}
            placeholder="Tanpa supplier"
          />
          <VariantEditor
            variants={createForm.variants}
            onChange={(vv) => setCreateForm({ ...createForm, variants: vv })}
            units={units}
            showActive={false}
          />
          <Button onClick={handleCreate} loading={loading} className="w-full">
            Simpan Produk
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        title={`Edit: ${editingProduct?.name ?? ""}`}
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nama Produk"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
            <Select
              label="Kategori"
              value={editForm.category}
              onChange={(v) => setEditForm({ ...editForm, category: v })}
              options={categories.map((c) => ({ value: c.name, label: c.name }))}
              placeholder="Pilih kategori"
            />
          </div>
          <Select
            label="Supplier"
            value={editForm.supplierId}
            onChange={(v) => setEditForm({ ...editForm, supplierId: v })}
            options={suppliers.map((s) => ({ value: String(s.id), label: s.name }))}
            placeholder="Tanpa supplier"
          />
          <VariantEditor
            variants={editForm.variants}
            onChange={(vv) => setEditForm({ ...editForm, variants: vv })}
            units={units}
            showActive
          />
          <Button onClick={handleSaveEdit} loading={loading} className="w-full">
            Simpan Perubahan
          </Button>
        </div>
      </Modal>

      <Modal open={!!csvData} onClose={() => {}} title="Petakan Kolom CSV" className="max-w-2xl">
        {csvData && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              {csvData.rows.length} baris terdeteksi. Pilih kolom CSV yang sesuai untuk setiap
              field.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {ALL_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <select
                    value={mapping[field.key] ?? ""}
                    onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">— tidak dipetakan —</option>
                    {csvData.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {csvData.preview.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">
                  Preview (3 baris pertama)
                </p>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="text-xs w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {csvData.headers.map((h) => (
                          <th
                            key={h}
                            className="px-3 py-2 text-left font-semibold text-gray-500 border-b border-gray-200 whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {csvData.preview.map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td
                              key={j}
                              className="px-3 py-1.5 text-gray-700 whitespace-nowrap max-w-[140px] truncate"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setCsvData(null)}
                disabled={importing}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                onClick={handleConfirmImport}
                loading={importing}
                disabled={REQUIRED_FIELDS.some((f) => !mapping[f])}
                className="flex-1"
              >
                Import {csvData.rows.length} Baris
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function VariantEditor({
  variants,
  onChange,
  units,
  showActive,
}: {
  variants: EditVariantRow[]
  onChange: (vv: EditVariantRow[]) => void
  units: Option[]
  showActive: boolean
}) {
  function update(i: number, field: keyof EditVariantRow, val: string | boolean) {
    const vv = [...variants]
    ;(vv[i] as any)[field] = val
    onChange(vv)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-gray-700">Varian</p>
        <button
          type="button"
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          onClick={() => onChange([...variants, blankVariantRow()])}
        >
          + Tambah Varian
        </button>
      </div>
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {variants.map((v, i) => (
          <div
            key={i}
            className={`border rounded-xl p-3 space-y-2 transition-colors ${!v.isActive ? "border-gray-200 bg-gray-50/60 opacity-60" : "border-indigo-100 bg-indigo-50/20"}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Varian {i + 1}</span>
              {showActive && (
                <Toggle
                  checked={v.isActive}
                  onChange={(val) => update(i, "isActive", val)}
                  label={v.isActive ? "Aktif" : "Nonaktif"}
                  size="sm"
                />
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input
                label="Nama Varian"
                placeholder="cth. 1kg"
                value={v.variantName}
                onChange={(e) => update(i, "variantName", e.target.value)}
              />
              <Input
                label="Barcode"
                placeholder="(opsional)"
                value={v.barcode}
                onChange={(e) => update(i, "barcode", e.target.value)}
              />
              <Select
                label="Satuan"
                value={v.unit}
                onChange={(val) => update(i, "unit", val)}
                options={units.map((u) => ({ value: u.name, label: u.name }))}
                placeholder="Pilih satuan"
              />
              <Input
                label="Harga Jual (Rp)"
                placeholder="0"
                type="number"
                value={v.price}
                onChange={(e) => update(i, "price", e.target.value)}
              />
              <Input
                label="Stok"
                placeholder="0"
                type="number"
                value={v.stock}
                onChange={(e) => update(i, "stock", e.target.value)}
              />
              <Input
                label="Min Stok"
                placeholder="5"
                type="number"
                value={v.lowStockThreshold}
                onChange={(e) => update(i, "lowStockThreshold", e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
