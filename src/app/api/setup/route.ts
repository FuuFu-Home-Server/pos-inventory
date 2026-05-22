import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hash } from "bcryptjs"
import { z } from "zod"

const setupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
})

export async function GET() {
  try {
    const count = await prisma.user.count()
    return NextResponse.json({ needsSetup: count === 0 })
  } catch {
    return NextResponse.json({ error: "Database tidak tersedia" }, { status: 503 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = setupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { name, email, password } = parsed.data
  const passwordHash = await hash(password, 10)

  try {
    await prisma.$transaction(async (tx) => {
      const count = await tx.user.count()
      if (count > 0) throw new Error("already_setup")

      const adminRole = await tx.role.upsert({
        where: { name: "ADMIN" },
        update: {},
        create: { name: "ADMIN" },
      })
      await tx.role.upsert({
        where: { name: "EMPLOYEE" },
        update: {},
        create: { name: "EMPLOYEE" },
      })

      await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          roleId: adminRole.id,
          isActive: true,
          isDefaultCredential: false,
        },
      })
    })
  } catch (err) {
    if (err instanceof Error && err.message === "already_setup") {
      return NextResponse.json({ error: "Setup sudah selesai" }, { status: 403 })
    }
    return NextResponse.json({ error: "Gagal membuat akun" }, { status: 500 })
  }

  return NextResponse.json({ message: "Setup complete" }, { status: 201 })
}
