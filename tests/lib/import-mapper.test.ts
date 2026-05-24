import { describe, it, expect } from "vitest"
import {
  mapSupplier,
  mapCustomer,
  mapUserRole,
  mapBarcode,
  mapProduct,
  mapBaseVariant,
  mapVariantFromIsian2,
  type OldBarang,
  type OldSuplier,
  type OldCustomer,
  type OldIsian2,
} from "@/lib/import-mapper"

const baseBarang: OldBarang = {
  IDBARANG: "1",
  NAMA: "Beras Premium ",
  SATUAN: "kg",
  STOCK: 50.7,
  HRG_JUAL: 15_000,
  HRG_BELI: 12_000,
  BATAS1: 10,
  KODE_LAIN: "8991234567890",
  SUPLIER: "SUP01",
}

describe("mapBarcode", () => {
  it("returns barcode string when valid", () => {
    expect(mapBarcode("8991234567890")).toBe("8991234567890")
  })

  it("returns null for dash", () => {
    expect(mapBarcode("-")).toBeNull()
  })

  it("returns null for empty string", () => {
    expect(mapBarcode("")).toBeNull()
  })

  it("trims whitespace before checking", () => {
    expect(mapBarcode("  -  ".trim())).toBeNull()
    expect(mapBarcode("  123  ".trim())).toBe("123")
  })
})

describe("mapUserRole", () => {
  it("returns ADMIN for ADMIN level", () => {
    expect(mapUserRole("ADMIN")).toBe("ADMIN")
  })

  it("returns ADMIN for OWNER level", () => {
    expect(mapUserRole("OWNER")).toBe("ADMIN")
  })

  it("returns ADMIN case-insensitive", () => {
    expect(mapUserRole("admin")).toBe("ADMIN")
    expect(mapUserRole("Owner")).toBe("ADMIN")
  })

  it("returns EMPLOYEE for other levels", () => {
    expect(mapUserRole("KASIR")).toBe("EMPLOYEE")
    expect(mapUserRole("STAFF")).toBe("EMPLOYEE")
    expect(mapUserRole("")).toBe("EMPLOYEE")
  })
})

describe("mapSupplier", () => {
  it("maps name, address, phone", () => {
    const row: OldSuplier = {
      IDSUPLIER: "S1",
      NAMA: " Toko Maju ",
      ALAMAT: "Jl. Pasar No.1",
      TELP: "0812345",
    }
    expect(mapSupplier(row)).toEqual({
      name: "Toko Maju",
      address: "Jl. Pasar No.1",
      phone: "0812345",
    })
  })

  it("returns null for empty address/phone", () => {
    const row: OldSuplier = { IDSUPLIER: "S2", NAMA: "Supplier", ALAMAT: "", TELP: "" }
    expect(mapSupplier(row)).toEqual({ name: "Supplier", address: null, phone: null })
  })
})

describe("mapCustomer", () => {
  it("maps name, address, phone", () => {
    const row: OldCustomer = {
      IDCUSTOMER: "C1",
      NAMA: " Budi ",
      ALAMAT: "Jl. Mawar",
      TELP: "0811",
    }
    expect(mapCustomer(row)).toEqual({ name: "Budi", address: "Jl. Mawar", phone: "0811" })
  })

  it("returns null for empty fields", () => {
    const row: OldCustomer = { IDCUSTOMER: "C2", NAMA: "Pelanggan", ALAMAT: "", TELP: "" }
    expect(mapCustomer(row)).toEqual({ name: "Pelanggan", address: null, phone: null })
  })
})

describe("mapProduct", () => {
  it("maps name, default category, supplierId", () => {
    expect(mapProduct(baseBarang, 5)).toEqual({
      name: "Beras Premium",
      category: "Umum",
      supplierId: 5,
    })
  })

  it("accepts null supplierId", () => {
    expect(mapProduct(baseBarang, null)).toMatchObject({ supplierId: null })
  })

  it("trims product name", () => {
    expect(mapProduct({ ...baseBarang, NAMA: "  Gula Pasir  " }, null).name).toBe("Gula Pasir")
  })
})

describe("mapBaseVariant", () => {
  it("maps all fields correctly", () => {
    const result = mapBaseVariant(baseBarang)
    expect(result).toEqual({
      variantName: "kg",
      barcode: "8991234567890",
      price: 15_000,
      costPrice: 12_000,
      stock: 51,
      lowStockThreshold: 10,
      unit: "kg",
    })
  })

  it("returns null barcode when KODE_LAIN is dash", () => {
    expect(mapBaseVariant({ ...baseBarang, KODE_LAIN: "-" }).barcode).toBeNull()
  })

  it("returns null costPrice when HRG_BELI is 0", () => {
    expect(mapBaseVariant({ ...baseBarang, HRG_BELI: 0 }).costPrice).toBeNull()
  })

  it("defaults lowStockThreshold to 5 when BATAS1 is 0", () => {
    expect(mapBaseVariant({ ...baseBarang, BATAS1: 0 }).lowStockThreshold).toBe(5)
  })

  it("rounds stock to integer", () => {
    expect(mapBaseVariant({ ...baseBarang, STOCK: 10.9 }).stock).toBe(11)
  })
})

describe("mapVariantFromIsian2", () => {
  const row: OldIsian2 = { IDBARANG: "1", SATUAN: "dus", HRG_JUAL: 120_000, ISI: 12 }

  it("maps satuan and price", () => {
    const result = mapVariantFromIsian2(row)
    expect(result).toMatchObject({ variantName: "dus", price: 120_000, unit: "dus" })
  })

  it("barcode is always null", () => {
    expect(mapVariantFromIsian2(row).barcode).toBeNull()
  })

  it("costPrice is always null", () => {
    expect(mapVariantFromIsian2(row).costPrice).toBeNull()
  })

  it("stock defaults to 0", () => {
    expect(mapVariantFromIsian2(row).stock).toBe(0)
  })

  it("lowStockThreshold defaults to 5", () => {
    expect(mapVariantFromIsian2(row).lowStockThreshold).toBe(5)
  })
})
