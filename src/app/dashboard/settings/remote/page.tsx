"use client"

import { useEffect, useState } from "react"

export default function RemoteSettingsPage() {
  const [url, setUrl] = useState("")
  const [saved, setSaved] = useState(false)
  const [syncSecret, setSyncSecret] = useState("")
  const [secretSaved, setSecretSaved] = useState(false)
  const isElectron = typeof window !== "undefined" && !!window.electronAPI

  useEffect(() => {
    window.electronAPI?.getRemoteUrl().then(setUrl)
    window.electronAPI?.getSyncSecret().then(setSyncSecret)
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    await window.electronAPI?.setRemoteUrl(url)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleSaveSecret(e: React.FormEvent) {
    e.preventDefault()
    await window.electronAPI?.setSyncSecret(syncSecret)
    setSecretSaved(true)
    setTimeout(() => setSecretSaved(false), 2000)
  }

  if (!isElectron) {
    return (
      <div className="p-6 text-slate-400 text-sm">
        Pengaturan ini hanya tersedia di aplikasi desktop.
      </div>
    )
  }

  return (
    <div className="p-6 max-w-lg flex flex-col gap-8">
      <div>
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

      <div>
        <h2 className="text-base font-bold text-white mb-1">Sync Secret</h2>
        <p className="text-sm text-slate-400 mb-3">
          Harus sama dengan <code className="text-indigo-400">SYNC_SECRET</code> di server.
        </p>
        <form onSubmit={handleSaveSecret} className="flex flex-col gap-4">
          <input
            type="text"
            value={syncSecret}
            onChange={(e) => setSyncSecret(e.target.value)}
            placeholder="Masukkan sync secret..."
            className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors"
          >
            {secretSaved ? "Tersimpan ✓" : "Simpan"}
          </button>
        </form>
      </div>
    </div>
  )
}
