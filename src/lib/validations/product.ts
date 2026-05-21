import { z } from "zod"

export const variantSchema = z.object({
  variantName: z.string().min(1, "Nama varian wajib diisi"),
  barcode: z.string().min(1).optional().nullable(),
  price: z.number().positive("Harga harus lebih dari 0"),
  costPrice: z.number().positive().optional().nullable(),
  stock: z.number().int().min(0, "Stok tidak boleh negatif"),
  lowStockThreshold: z.number().int().min(0).default(5),
  unit: z.string().min(1, "Satuan wajib diisi"),
})

export const createProductSchema = z.object({
  name: z.string().min(1, "Nama produk wajib diisi"),
  category: z.string().min(1, "Kategori wajib diisi"),
  supplierId: z.number().int().positive().optional().nullable(),
  variants: z.array(variantSchema).min(1, "Minimal 1 varian"),
})

export const updateProductVariantSchema = z.object({
  id: z.number().int().optional(),
  variantName: z.string().min(1),
  barcode: z.string().min(1).optional().nullable(),
  price: z.number().positive(),
  stock: z.number().int().min(0),
  unit: z.string().min(1),
  lowStockThreshold: z.number().int().min(0).default(5),
  isActive: z.boolean().optional(),
})

export const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  supplierId: z.number().int().positive().optional().nullable(),
  variants: z.array(updateProductVariantSchema).optional(),
})

export const updateVariantSchema = variantSchema.partial()

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>
