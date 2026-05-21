import { z } from "zod"

export const createStockOpnameSchema = z.object({
  notes: z.string().optional(),
})

export const updateOpnameItemSchema = z.object({
  physicalQty: z.number().int().min(0, "Jumlah fisik tidak boleh negatif"),
})

export const confirmOpnameSchema = z.object({
  opnameId: z.number().int().positive(),
})
