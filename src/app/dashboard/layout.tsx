import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"
import { DashboardShell } from "@/components/dashboard/DashboardShell"

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") redirect("/kasir")

  return (
    <DashboardShell userName={session.user.name ?? "Admin"} userRole={session.user.role}>
      {children}
    </DashboardShell>
  )
}
