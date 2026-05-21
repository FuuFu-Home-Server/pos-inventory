import { z } from "zod"

export const poItemSchema = z.object({
  productVariantId: z.number().int().positive(),
  qty: z.number().int().positive(),
  unitCost: z.number().positive(),
})

export const createPurchaseOrderSchema = z.object({
  supplierId: z.number().int().positive("Pilih supplier"),
  notes: z.string().optional(),
  items: z.array(poItemSchema).min(1, "Minimal 1 item"),
})

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>
