import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUploadsDir } from "@/lib/uploads"
import { unlink } from "fs/promises"
import path from "path"

type Params = { params: Promise<{ id: string; imageId: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id, imageId } = await params

  const image = await prisma.purchaseListImage.findUnique({
    where: { id: Number(imageId), purchaseListId: Number(id) },
  })
  if (!image) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 })

  await prisma.purchaseListImage.delete({ where: { id: Number(imageId) } })

  try {
    await unlink(path.join(getUploadsDir(), image.filename))
  } catch {
    // File may already be missing — not fatal
  }

  return NextResponse.json({ ok: true })
}
