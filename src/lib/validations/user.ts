import { z } from "zod"

export const createUserSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  email: z.string().min(3, "Username minimal 3 karakter"),
  password: z.string().min(8, "Password minimal 8 karakter"),
  role: z.enum(["ADMIN", "EMPLOYEE"]),
})

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().min(3).optional(),
  password: z.string().min(8).optional(),
  role: z.enum(["ADMIN", "EMPLOYEE"]).optional(),
  isActive: z.boolean().optional(),
})

export const loginSchema = z.object({
  email: z.string().min(3, "Username minimal 3 karakter"),
  password: z.string().min(1, "Password wajib diisi"),
})

export const setupFormSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  email: z.string().min(3, "Username minimal 3 karakter"),
  password: z.string().min(8, "Password minimal 8 karakter"),
})
