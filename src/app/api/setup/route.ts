import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hash } from "bcryptjs"
import { z } from "zod"

const setupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
})

export async function GET() {
  const count = await prisma.user.count()
  return NextResponse.json({ needsSetup: count === 0 })
}

export async function POST(req: NextRequest) {
  const count = await prisma.user.count()
  if (count > 0) {
    return NextResponse.json({ error: "Setup sudah selesai" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = setupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { name, email, password } = parsed.data
  const passwordHash = await hash(password, 12)

  let adminRole = await prisma.role.findUnique({ where: { name: "ADMIN" } })
  if (!adminRole) {
    adminRole = await prisma.role.create({ data: { name: "ADMIN" } })
    await prisma.role.create({ data: { name: "EMPLOYEE" } })
  }

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      roleId: adminRole.id,
      isActive: true,
      isDefaultCredential: false,
    },
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
