import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUploadsDir } from "@/lib/uploads"
import { writeFile, mkdir, access } from "fs/promises"
import path from "path"

export async function GET() {
  const pending = await prisma.purchaseListImage.findMany({
    where: { syncStatus: "PENDING" },
    select: { id: true, filename: true },
  })
  return NextResponse.json(pending)
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-sync-secret")
  if (!secret || secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await req.formData()
  const filename = formData.get("filename")
  const file = formData.get("file")

  if (typeof filename !== "string" || !(file instanceof File)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  if (filename.includes("/") || filename.includes("..")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 })
  }

  const dir = getUploadsDir()
  await mkdir(dir, { recursive: true })
  const dest = path.join(dir, filename)

  try {
    await access(dest)
    return NextResponse.json({ ok: true, skipped: true })
  } catch {
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(dest, buffer)
    return NextResponse.json({ ok: true })
  }
}
