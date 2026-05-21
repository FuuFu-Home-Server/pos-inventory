import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"
import { Sidebar } from "@/components/dashboard/Sidebar"

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") redirect("/kasir")

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar userName={session.user.name ?? "Admin"} userRole={session.user.role} />
      <main className="flex-1 overflow-auto min-h-screen">{children}</main>
    </div>
  )
}
