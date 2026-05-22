import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

const ADMIN_ONLY_PREFIXES = [
  "/dashboard",
  "/api/products",
  "/api/suppliers",
  "/api/customers",
  "/api/users",
  "/api/purchase-orders",
  "/api/stock-opname",
  "/api/discounts",
  "/api/receipt-config",
  "/api/import",
]

const PUBLIC_PATHS = ["/login", "/api/auth", "/api/webhooks/midtrans"]

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  const isAdminOnly = ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p))
  if (isAdminOnly && session.user.role !== "ADMIN") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
    }
    return NextResponse.redirect(new URL("/kasir", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
