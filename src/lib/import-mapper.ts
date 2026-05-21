export type OldBarang = {
  IDBARANG: string
  NAMA: string
  SATUAN: string
  STOCK: number
  HRG_JUAL: number
  HRG_BELI: number
  BATAS1: number
  KODE_LAIN: string
  SUPLIER: string
}
export type OldIsian2 = {
  IDBARANG: string
  SATUAN: string
  HRG_JUAL: number
  ISI: number
}
export type OldSuplier = { IDSUPLIER: string; NAMA: string; ALAMAT: string; TELP: string }
export type OldCustomer = { IDCUSTOMER: string; NAMA: string; ALAMAT: string; TELP: string }
export type OldAspass = { FNAMA: string; FNM: string; FLEVEL: string; FPASS: string }

export function mapSupplier(row: OldSuplier) {
  return {
    name: row.NAMA.trim(),
    address: row.ALAMAT.trim() || null,
    phone: row.TELP.trim() || null,
  }
}

export function mapCustomer(row: OldCustomer) {
  return {
    name: row.NAMA.trim(),
    address: row.ALAMAT.trim() || null,
    phone: row.TELP.trim() || null,
  }
}

export function mapUserRole(flevel: string): "ADMIN" | "EMPLOYEE" {
  const l = flevel.trim().toUpperCase()
  return l.includes("ADMIN") || l.includes("OWNER") ? "ADMIN" : "EMPLOYEE"
}

export function mapBarcode(kode: string): string | null {
  const v = kode.trim()
  return v && v !== "-" ? v : null
}

export function mapProduct(row: OldBarang, supplierId: number | null) {
  return {
    name: row.NAMA.trim(),
    category: "Umum",
    supplierId,
  }
}

export function mapBaseVariant(row: OldBarang) {
  return {
    variantName: row.SATUAN.trim(),
    barcode: mapBarcode(row.KODE_LAIN),
    price: row.HRG_JUAL,
    costPrice: row.HRG_BELI > 0 ? row.HRG_BELI : null,
    stock: Math.round(row.STOCK),
    lowStockThreshold: row.BATAS1 > 0 ? Math.round(row.BATAS1) : 5,
    unit: row.SATUAN.trim(),
  }
}

export function mapVariantFromIsian2(row: OldIsian2) {
  return {
    variantName: row.SATUAN.trim(),
    barcode: null,
    price: row.HRG_JUAL,
    costPrice: null,
    stock: 0,
    lowStockThreshold: 5,
    unit: row.SATUAN.trim(),
  }
}
