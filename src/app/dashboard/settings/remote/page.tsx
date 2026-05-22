"use client"

import { useEffect, useState } from "react"

export default function RemoteSettingsPage() {
  const [url, setUrl] = useState("")
  const [saved, setSaved] = useState(false)
  const isElectron = typeof window !== "undefined" && !!window.electronAPI

  useEffect(() => {
    window.electronAPI?.getRemoteUrl().then(setUrl)
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    await window.electronAPI?.setRemoteUrl(url)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!isElectron) {
    return (
      <div className="p-6 text-slate-400 text-sm">
        Pengaturan ini hanya tersedia di aplikasi desktop.
      </div>
    )
  }

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-lg font-bold text-white mb-2">Server Remote</h1>
      <p className="text-sm text-slate-400 mb-6">
        URL server Tailscale untuk sinkronisasi data. Contoh:{" "}
        <code className="text-indigo-400">https://kasir.your-tailnet.ts.net</code>
      </p>
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://kasir.your-tailnet.ts.net"
          className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors"
        >
          {saved ? "Tersimpan ✓" : "Simpan"}
        </button>
      </form>
    </div>
  )
}
