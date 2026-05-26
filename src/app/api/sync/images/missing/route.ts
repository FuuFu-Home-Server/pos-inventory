import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUploadsDir } from "@/lib/uploads"
import { access } from "fs/promises"
import path from "path"

export async function GET() {
  const images = await prisma.purchaseListImage.findMany({
    select: { filename: true },
  })
  const dir = getUploadsDir()

  const missing: string[] = []
  for (const { filename } of images) {
    try {
      await access(path.join(dir, filename))
    } catch {
      missing.push(filename)
    }
  }

  return NextResponse.json(missing)
}
