import { NextRequest, NextResponse } from "next/server"
import { getUploadsDir } from "@/lib/uploads"
import { readFile } from "fs/promises"
import path from "path"

type Params = { params: Promise<{ filename: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { filename } = await params

  if (filename.includes("/") || filename.includes("..")) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 })
  }

  const ext = path.extname(filename).slice(1).toLowerCase()
  const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg"

  try {
    const buffer = await readFile(path.join(getUploadsDir(), filename))
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 })
  }
}
