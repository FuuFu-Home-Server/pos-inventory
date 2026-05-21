import { auth } from "@/lib/auth"

export default async function DashboardPage() {
  const session = await auth()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Selamat datang, {session?.user.name}</h1>
      <p className="text-gray-500 text-sm">Sistem POS & Manajemen Inventori</p>
    </div>
  )
}
