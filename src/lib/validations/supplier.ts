import { z } from "zod"

export const createSupplierSchema = z.object({
  name: z.string().min(1, "Nama supplier wajib diisi"),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
})

export const updateSupplierSchema = createSupplierSchema.partial()
