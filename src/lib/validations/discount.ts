import { z } from "zod"

const discountBaseSchema = z.object({
  name: z.string().min(1, "Nama diskon wajib diisi"),
  type: z.enum(["PERCENT", "FLAT"]),
  value: z.number().positive("Nilai diskon harus lebih dari 0"),
  scope: z.enum(["TRANSACTION", "PRODUCT"]),
  productId: z.number().int().positive().optional().nullable(),
  minPurchase: z.number().positive().optional().nullable(),
  isActive: z.boolean().default(true),
  validFrom: z.string().datetime().optional().nullable(),
  validUntil: z.string().datetime().optional().nullable(),
})

export const createDiscountSchema = discountBaseSchema.refine(
  (d) => (d.scope === "PRODUCT" ? d.productId != null : true),
  { message: "productId wajib diisi untuk diskon PRODUCT", path: ["productId"] },
)

export const updateDiscountSchema = discountBaseSchema.partial()

export type CreateDiscountInput = z.infer<typeof createDiscountSchema>
