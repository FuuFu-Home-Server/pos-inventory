import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { updateUserSchema } from "@/lib/validations/user"
import bcrypt from "bcryptjs"

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const data: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.role) {
    const role = await prisma.role.findUnique({ where: { name: parsed.data.role } })
    if (!role) return NextResponse.json({ error: "Role tidak valid" }, { status: 400 })
    data.roleId = role.id
    delete data.role
  }
  if (parsed.data.password) {
    data.passwordHash = await bcrypt.hash(parsed.data.password, 12)
    delete data.password
  }

  const user = await prisma.user.update({
    where: { id: Number(id) },
    data,
    include: { role: { select: { name: true } } },
  })
  const { passwordHash: _ph, ...safeUser } = user
  return NextResponse.json(safeUser)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  await prisma.user.update({ where: { id: Number(id) }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}
