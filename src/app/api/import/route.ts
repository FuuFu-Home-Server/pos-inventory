import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json(
    { error: "Fitur import GDB belum tersedia. Dalam pengembangan." },
    { status: 501 }
  )
}

export async function GET() {
  return NextResponse.json({ logs: [], message: "Fitur import GDB dalam pengembangan." })
}
