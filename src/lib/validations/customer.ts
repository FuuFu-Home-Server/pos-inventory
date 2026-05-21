import { z } from "zod"

export const createCustomerSchema = z.object({
  name: z.string().min(1, "Nama pelanggan wajib diisi"),
  phone: z.string().min(1).optional().nullable(),
  address: z.string().optional().nullable(),
})

export const updateCustomerSchema = createCustomerSchema.partial()
