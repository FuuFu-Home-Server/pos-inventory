import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUploadsDir } from "@/lib/uploads"
import { randomUUID } from "crypto"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_SIZE = 1 * 1024 * 1024

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const listId = Number(id)

  const list = await prisma.purchaseList.findUnique({ where: { id: listId } })
  if (!list) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File tidak valid" }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Format tidak didukung" }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  if (buffer.length > MAX_SIZE) {
    return NextResponse.json({ error: "File terlalu besar (max 1MB)" }, { status: 400 })
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"
  const filename = `${randomUUID()}.${ext}`

  const dir = getUploadsDir()
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, filename), buffer)

  const image = await prisma.purchaseListImage.create({
    data: { purchaseListId: listId, filename, syncStatus: "PENDING" },
  })

  return NextResponse.json({ id: image.id, filename }, { status: 201 })
}
