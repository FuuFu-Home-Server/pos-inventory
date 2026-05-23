import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createUserSchema } from "@/lib/validations/user"
import bcrypt from "bcryptjs"

export async function GET() {
  const users = await prisma.user.findMany({
    include: { role: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json({ users })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const role = await prisma.role.findUnique({ where: { name: parsed.data.role } })
  if (!role) return NextResponse.json({ error: "Role tidak ditemukan" }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (existing) return NextResponse.json({ error: "Email sudah digunakan" }, { status: 409 })

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)
  const user = await prisma.user.create({
    data: { name: parsed.data.name, email: parsed.data.email, passwordHash, roleId: role.id },
    include: { role: { select: { name: true } } },
  })

  const { passwordHash: _ph, ...safeUser } = user
  return NextResponse.json(safeUser, { status: 201 })
}
