import { NextRequest, NextResponse } from "next/server"
import { getUploadsDir } from "@/lib/uploads"
import { readFile } from "fs/promises"
import path from "path"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const secret = req.headers.get("x-sync-secret")
  if (!secret || secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: filename } = await params
  if (filename.includes("/") || filename.includes("..")) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 })
  }

  const ext = path.extname(filename).slice(1).toLowerCase()
  const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg"

  try {
    const buffer = await readFile(path.join(getUploadsDir(), filename))
    return new NextResponse(buffer, { headers: { "Content-Type": mime } })
  } catch {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 })
  }
}
