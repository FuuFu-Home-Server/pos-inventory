import type { Metadata } from "next"
import type { ReactNode } from "react"
import { SessionProvider } from "next-auth/react"
import { auth } from "@/lib/auth"
import "./globals.css"

export const metadata: Metadata = {
  title: "Kasir",
  description: "POS & Inventory Management",
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  return (
    <html lang="id">
      <body>
        <SessionProvider session={session}>{children}</SessionProvider>
      </body>
    </html>
  )
}
