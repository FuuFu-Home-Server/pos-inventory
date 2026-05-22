import { z } from "zod"

export const transactionItemSchema = z.object({
  variantId: z.number().int().positive(),
  qty: z.number().int().positive("Qty harus lebih dari 0"),
  unitPrice: z.number().positive(),
  itemDiscountAmt: z.number().min(0).default(0),
})

export const completeTransactionSchema = z.object({
  items: z.array(transactionItemSchema).min(1, "Keranjang kosong"),
  customerId: z.number().int().positive().optional().nullable(),
  discountId: z.number().int().positive().optional().nullable(),
  paymentMethodId: z.number().int().positive("Pilih metode pembayaran"),
  paymentAmount: z.number().positive("Nominal bayar wajib diisi"),
  localId: z.string().uuid().optional(),
})

export type CompleteTransactionInput = z.infer<typeof completeTransactionSchema>
