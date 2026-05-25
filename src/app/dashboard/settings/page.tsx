"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Toast } from "@/components/ui/Toast"
import {
  Monitor,
  AppWindow,
  Save,
  Check,
  RefreshCw,
  Globe,
  Rocket,
  Wifi,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Clock,
} from "lucide-react"
import { useSession } from "next-auth/react"

const SIZE_PRESETS = [
  { label: "1024 × 600", w: 1024, h: 600 },
  { label: "1280 × 800", w: 1280, h: 800 },
  { label: "1366 × 768", w: 1366, h: 768 },
  { label: "1440 × 900", w: 1440, h: 900 },
  { label: "1920 × 1080", w: 1920, h: 1080 },
]

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? "bg-indigo-600" : "bg-gray-200"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`}
      />
    </button>
  )
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={16} className="text-indigo-500" />
      <h2 className="font-bold text-gray-800">{title}</h2>
    </div>
  )
}

export default function SettingsPage() {
  const [isElectron, setIsElectron] = useState(false)
  const { data: session } = useSession()

  useEffect(() => {
    setIsElectron(typeof window !== "undefined" && !!window.electronAPI)
  }, [])

  const [pwCurrent, setPwCurrent] = useState("")
  const [pwNew, setPwNew] = useState("")
  const [pwConfirm, setPwConfirm] = useState("")
  const [pwLoading, setPwLoading] = useState(false)
  const [pwFieldErrors, setPwFieldErrors] = useState<Record<string, string>>({})
  const [pwResult, setPwResult] = useState<{ ok?: boolean; error?: string } | null>(null)
  const [showPw, setShowPw] = useState(false)

  const [appTitle, setAppTitle] = useState("Kasir")
  const [appDesc, setAppDesc] = useState("POS & Inventori")
  const [appLoading, setAppLoading] = useState(false)

  const [winSettings, setWinSettings] = useState<WindowSettings | null>(null)
  const [activePreset, setActivePreset] = useState<string | null>(null)

  const [autoLaunch, setAutoLaunch] = useState(false)

  const [remoteUrl, setRemoteUrl] = useState("")
  const [urlSaved, setUrlSaved] = useState(false)
  const [syncSecret, setSyncSecret] = useState("")
  const [secretSaved, setSecretSaved] = useState(false)

  const [timezone, setTimezone] = useState("")
  const [tzResult, setTzResult] = useState<{ ok?: boolean; error?: string } | null>(null)
  const [tzLoading, setTzLoading] = useState(false)
  const allTimezones = Intl.supportedValuesOf("timeZone")

  const [syncing, setSyncing] = useState(false)
  const [syncDone, setSyncDone] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [toast, setToast] = useState<{
    message: string
    type: "success" | "error" | "info"
  } | null>(null)
  const showToast = (message: string, type: "success" | "error" | "info" = "success") =>
    setToast({ message, type })

  useEffect(() => {
    if (!isElectron) return
    window.electronAPI!.getAppInfo().then((info) => {
      setAppTitle(info.title)
      setAppDesc(info.description)
    })
    window.electronAPI!.getWindowSettings().then((s) => {
      setWinSettings(s)
      const preset = SIZE_PRESETS.find((p) => p.w === s.width && p.h === s.height)
      setActivePreset(preset?.label ?? null)
    })
    window.electronAPI!.getAutoLaunch().then(setAutoLaunch)
    window.electronAPI!.getRemoteUrl().then(setRemoteUrl)
    window.electronAPI!.getSyncSecret().then(setSyncSecret)
    window.electronAPI!.getTimezone().then(setTimezone)
    window.electronAPI!.getSyncStatus().then(setSyncStatus)
    const unsub = window.electronAPI!.onSyncStatus(() => {
      window.electronAPI!.getSyncStatus().then(setSyncStatus)
    })
    return unsub
  }, [isElectron])

  async function handleSaveAppInfo() {
    if (!isElectron) return
    setAppLoading(true)
    const res = await window.electronAPI!.setAppInfo({ title: appTitle, description: appDesc })
    setAppLoading(false)
    if (res?.error) {
      showToast(res.error, "error")
    } else {
      showToast("Identitas aplikasi disimpan")
      setTimeout(() => window.location.reload(), 1000)
    }
  }

  async function handleSetSize(w: number, h: number, label: string) {
    if (!isElectron) return
    await window.electronAPI!.setWindowSize(w, h)
    setActivePreset(label)
    setWinSettings((prev) => (prev ? { ...prev, width: w, height: h, isFullscreen: false } : prev))
    showToast(`Ukuran jendela diubah ke ${label}`)
  }

  async function handleToggleFullscreen() {
    if (!isElectron) return
    await window.electronAPI!.toggleFullscreen()
    const updated = await window.electronAPI!.getWindowSettings()
    setWinSettings(updated)
    if (updated.isFullscreen) setActivePreset(null)
    showToast(updated.isFullscreen ? "Layar penuh aktif" : "Layar penuh dinonaktifkan")
  }

  async function handleToggleAlwaysOnTop() {
    if (!isElectron) return
    await window.electronAPI!.toggleAlwaysOnTop()
    const updated = await window.electronAPI!.getWindowSettings()
    setWinSettings(updated)
    showToast(updated.isAlwaysOnTop ? "Selalu di atas aktif" : "Selalu di atas dinonaktifkan")
  }

  async function handleAutoLaunch(v: boolean) {
    if (!isElectron) return
    setAutoLaunch(v)
    await window.electronAPI!.setAutoLaunch(v)
    showToast(v ? "Auto startup diaktifkan" : "Auto startup dinonaktifkan")
  }

  async function handleSaveUrl(e: React.FormEvent) {
    e.preventDefault()
    if (!isElectron) return
    await window.electronAPI!.setRemoteUrl(remoteUrl)
    setUrlSaved(true)
    setTimeout(() => setUrlSaved(false), 2000)
    showToast("URL server disimpan")
  }

  async function handleSaveSecret(e: React.FormEvent) {
    e.preventDefault()
    if (!isElectron) return
    await window.electronAPI!.setSyncSecret(syncSecret)
    setSecretSaved(true)
    setTimeout(() => setSecretSaved(false), 2000)
    showToast("Sync secret disimpan")
  }

  async function handleSetTimezone() {
    if (!isElectron || !timezone) return
    setTzLoading(true)
    setTzResult(null)
    const result = await window.electronAPI!.setTimezone(timezone)
    setTzResult(result)
    setTzLoading(false)
    if (result?.ok) {
      window.dispatchEvent(new CustomEvent("timezone-changed", { detail: timezone }))
      showToast(`Zona waktu diubah ke ${timezone.replace(/_/g, " ")}`)
    } else if (result?.error) {
      showToast(result.error, "error")
    }
  }

  async function handleSync() {
    if (!isElectron || syncing) return
    setSyncing(true)
    await window.electronAPI!.triggerSync()
    const updated = await window.electronAPI!.getSyncStatus()
    setSyncStatus(updated)
    setSyncing(false)
    setSyncDone(true)
    setTimeout(() => setSyncDone(false), 2000)
    showToast("Sinkronisasi selesai")
  }

  const [mirroringPull, setMirroringPull] = useState(false)
  const [mirroringPush, setMirroringPush] = useState(false)

  async function handlePullMirror() {
    if (!isElectron || mirroringPull || mirroringPush || syncing) return
    const ok = window.confirm(
      "Pull dari server akan menghapus semua katalog lokal (produk, diskon, dll) dan menggantinya penuh dari server. Lanjutkan?",
    )
    if (!ok) return
    setMirroringPull(true)
    await window.electronAPI!.triggerPullMirror()
    const updated = await window.electronAPI!.getSyncStatus()
    setSyncStatus(updated)
    setMirroringPull(false)
    showToast("Pull selesai — katalog lokal diganti dari server")
  }

  async function handlePushMirror() {
    if (!isElectron || mirroringPull || mirroringPush || syncing) return
    const ok = window.confirm(
      "Push ke server akan menghapus semua katalog server dan menggantinya penuh dari data lokal. Lanjutkan?",
    )
    if (!ok) return
    setMirroringPush(true)
    await window.electronAPI!.triggerPushMirror()
    const updated = await window.electronAPI!.getSyncStatus()
    setSyncStatus(updated)
    setMirroringPush(false)
    showToast("Push selesai — katalog server diganti dari lokal")
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    const errors: Record<string, string> = {}
    if (!pwCurrent) errors.pwCurrent = "Password saat ini wajib diisi"
    if (pwNew.length < 8) errors.pwNew = "Password baru minimal 8 karakter"
    if (pwNew !== pwConfirm) errors.pwConfirm = "Konfirmasi password tidak cocok"
    if (Object.keys(errors).length > 0) {
      setPwFieldErrors(errors)
      return
    }
    setPwFieldErrors({})
    setPwLoading(true)
    setPwResult(null)
    const res = await fetch("/api/me/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
    })
    const data = await res.json()
    setPwResult(data)
    setPwLoading(false)
    if (data.ok) {
      setPwCurrent("")
      setPwNew("")
      setPwConfirm("")
      showToast("Password berhasil diubah")
    } else {
      showToast(data.error ?? "Gagal mengubah password", "error")
    }
  }

  const notElectron = <p className="text-sm text-gray-400">Hanya tersedia di aplikasi desktop.</p>

  return (
    <div className="p-4 md:p-6 max-w-2xl space-y-6">
      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
      <div>
        <h1 className="text-xl font-black md:text-2xl text-gray-900">Pengaturan Aplikasi</h1>
        <p className="text-sm text-gray-500 mt-0.5">Konfigurasi tampilan dan perilaku aplikasi</p>
      </div>

      {/* Account */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <SectionHeader icon={User} title="Akun Saya" />
        {session?.user && (
          <div className="mb-4 flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold shrink-0">
              {(session.user.name ?? "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{session.user.name}</p>
              <p className="text-xs text-gray-400">
                {session.user.email} · {session.user.role === "ADMIN" ? "Admin" : "Kasir"}
              </p>
            </div>
          </div>
        )}
        <form onSubmit={handleChangePassword} className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Ganti Password
          </p>
          <PasswordField
            label="Password Saat Ini"
            value={pwCurrent}
            onChange={setPwCurrent}
            show={showPw}
            onToggleShow={() => setShowPw((v) => !v)}
            error={pwFieldErrors.pwCurrent}
          />
          <PasswordField
            label="Password Baru"
            value={pwNew}
            onChange={setPwNew}
            show={showPw}
            error={pwFieldErrors.pwNew}
          />
          <PasswordField
            label="Konfirmasi Password Baru"
            value={pwConfirm}
            onChange={setPwConfirm}
            show={showPw}
            error={pwFieldErrors.pwConfirm}
          />
          {pwResult && (
            <p
              className={`text-xs px-3 py-2 rounded-lg border ${
                pwResult.ok
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-red-50 border-red-200 text-red-600"
              }`}
            >
              {pwResult.ok ? "Password berhasil diubah." : pwResult.error}
            </p>
          )}
          <Button
            type="submit"
            loading={pwLoading}
            disabled={!pwCurrent || !pwNew || !pwConfirm}
            className="flex items-center gap-2"
          >
            {pwResult?.ok ? (
              <>
                <Check size={14} /> Tersimpan
              </>
            ) : (
              <>
                <Save size={14} /> Ubah Password
              </>
            )}
          </Button>
        </form>
      </section>

      {/* App Info */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <SectionHeader icon={AppWindow} title="Identitas Aplikasi" />
        <div className="space-y-3">
          <Input
            label="Nama Aplikasi"
            value={appTitle}
            onChange={(e) => setAppTitle(e.target.value)}
            placeholder="Kasir"
          />
          <Input
            label="Deskripsi"
            value={appDesc}
            onChange={(e) => setAppDesc(e.target.value)}
            placeholder="POS & Inventori"
          />
          {!isElectron && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Perubahan nama hanya aktif di aplikasi desktop.
            </p>
          )}
          <Button
            onClick={handleSaveAppInfo}
            loading={appLoading}
            disabled={!isElectron || !appTitle.trim()}
            className="flex items-center gap-2"
          >
            <>
              <Save size={14} /> Simpan
            </>
          </Button>
        </div>
      </section>

      {/* Auto Launch */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <SectionHeader icon={Rocket} title="Auto Startup" />
        {!isElectron ? (
          notElectron
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Jalankan saat sistem menyala</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Aplikasi otomatis terbuka setelah login
              </p>
            </div>
            <Toggle checked={autoLaunch} onChange={handleAutoLaunch} />
          </div>
        )}
      </section>

      {/* Sync */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <SectionHeader icon={Wifi} title="Sinkronisasi" />
        {!isElectron ? (
          notElectron
        ) : (
          <div className="space-y-4">
            <form onSubmit={handleSaveUrl} className="space-y-3">
              <Input
                label="URL Server Remote"
                value={remoteUrl}
                onChange={(e) => setRemoteUrl(e.target.value)}
                placeholder="https://kasir.your-tailnet.ts.net"
              />
              <Button type="submit" disabled={!remoteUrl} className="flex items-center gap-2">
                {urlSaved ? (
                  <>
                    <Check size={14} /> Tersimpan
                  </>
                ) : (
                  <>
                    <Save size={14} /> Simpan URL
                  </>
                )}
              </Button>
            </form>
            {remoteUrl && (
              <p className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 font-mono break-all">
                {remoteUrl}
              </p>
            )}

            <form onSubmit={handleSaveSecret} className="space-y-3">
              <Input
                label="Sync Secret"
                type="password"
                value={syncSecret}
                onChange={(e) => setSyncSecret(e.target.value)}
                placeholder="Masukkan sync secret..."
              />
              <Button type="submit" disabled={!syncSecret} className="flex items-center gap-2">
                {secretSaved ? (
                  <>
                    <Check size={14} /> Tersimpan
                  </>
                ) : (
                  <>
                    <Save size={14} /> Simpan Secret
                  </>
                )}
              </Button>
            </form>

            {syncStatus && (
              <div className="grid grid-cols-3 gap-2">
                <div
                  className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2.5 border ${syncStatus.isOnline ? "bg-emerald-50 border-emerald-100" : "bg-gray-50 border-gray-100"}`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center ${syncStatus.isOnline ? "bg-emerald-500" : "bg-gray-400"}`}
                  >
                    <Check size={11} className="text-white" />
                  </div>
                  <p
                    className={`text-xs font-semibold ${syncStatus.isOnline ? "text-emerald-700" : "text-gray-500"}`}
                  >
                    {syncStatus.isOnline ? "Online" : "Offline"}
                  </p>
                </div>
                <div
                  className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2.5 border ${syncStatus.pendingCount > 0 ? "bg-amber-50 border-amber-100" : "bg-emerald-50 border-emerald-100"}`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center ${syncStatus.pendingCount > 0 ? "bg-amber-400" : "bg-emerald-500"}`}
                  >
                    {syncStatus.pendingCount > 0 ? (
                      <Clock size={11} className="text-white" />
                    ) : (
                      <Check size={11} className="text-white" />
                    )}
                  </div>
                  <p
                    className={`text-xs font-semibold ${syncStatus.pendingCount > 0 ? "text-amber-700" : "text-emerald-700"}`}
                  >
                    {syncStatus.pendingCount} pending
                  </p>
                </div>
                <div
                  className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2.5 border ${syncStatus.failedCount > 0 ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"}`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center ${syncStatus.failedCount > 0 ? "bg-red-500" : "bg-emerald-500"}`}
                  >
                    {syncStatus.failedCount > 0 ? (
                      <AlertCircle size={11} className="text-white" />
                    ) : (
                      <Check size={11} className="text-white" />
                    )}
                  </div>
                  <p
                    className={`text-xs font-semibold ${syncStatus.failedCount > 0 ? "text-red-600" : "text-emerald-700"}`}
                  >
                    {syncStatus.failedCount} gagal
                  </p>
                </div>
              </div>
            )}
            {syncStatus?.lastSyncAt && (
              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <Clock size={11} />
                Terakhir sinkron: {new Date(syncStatus.lastSyncAt).toLocaleString("id-ID")}
              </p>
            )}

            <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">Sinkronisasi Manual</p>
                <p className="text-xs text-gray-400 mt-0.5">Kirim transaksi pending ke server</p>
              </div>
              <Button
                onClick={handleSync}
                loading={syncing}
                variant="secondary"
                className="flex items-center gap-2"
              >
                {syncDone ? (
                  <>
                    <Check size={14} /> Selesai
                  </>
                ) : (
                  <>
                    <RefreshCw size={14} /> Sinkronisasi
                  </>
                )}
              </Button>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">Pull dari Server</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Ganti katalog lokal penuh dengan data server
                  </p>
                </div>
                <Button
                  onClick={handlePullMirror}
                  loading={mirroringPull}
                  variant="secondary"
                  className="flex items-center gap-2 text-amber-600 border-amber-200 hover:bg-amber-50"
                >
                  <RefreshCw size={14} /> Pull
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">Push ke Server</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Ganti katalog server penuh dengan data lokal
                  </p>
                </div>
                <Button
                  onClick={handlePushMirror}
                  loading={mirroringPush}
                  variant="secondary"
                  className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
                >
                  <RefreshCw size={14} /> Push
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Window */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <SectionHeader icon={Monitor} title="Ukuran & Tampilan Jendela" />
        {!isElectron ? (
          notElectron
        ) : (
          <div className="space-y-4">
            {winSettings && (
              <p className="text-xs text-gray-500">
                Saat ini:{" "}
                <span className="font-mono text-gray-700">
                  {winSettings.isFullscreen
                    ? "Layar Penuh"
                    : `${winSettings.width} × ${winSettings.height}`}
                </span>
              </p>
            )}

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Preset Resolusi
              </p>
              <div className="grid grid-cols-3 gap-2">
                {SIZE_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => handleSetSize(p.w, p.h, p.label)}
                    className={`py-2 px-3 text-sm rounded-lg border-2 font-medium transition-all ${
                      activePreset === p.label && !winSettings?.isFullscreen
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1 pt-1 border-t border-gray-100">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">Layar Penuh</p>
                  <p className="text-xs text-gray-400">Toggle mode fullscreen</p>
                </div>
                <Toggle checked={!!winSettings?.isFullscreen} onChange={handleToggleFullscreen} />
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">Selalu di Atas</p>
                  <p className="text-xs text-gray-400">Jendela tetap di atas aplikasi lain</p>
                </div>
                <Toggle checked={!!winSettings?.isAlwaysOnTop} onChange={handleToggleAlwaysOnTop} />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Timezone */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <SectionHeader icon={Globe} title="Zona Waktu" />
        {!isElectron ? (
          notElectron
        ) : (
          <div className="space-y-3">
            <TimezoneCombobox value={timezone} onChange={setTimezone} options={allTimezones} />
            {tzResult && (
              <p
                className={`text-xs px-3 py-2 rounded-lg border ${
                  tzResult.ok
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-red-50 border-red-200 text-red-600"
                }`}
              >
                {tzResult.ok ? "Zona waktu berhasil diubah." : tzResult.error}
              </p>
            )}
            <Button
              onClick={handleSetTimezone}
              loading={tzLoading}
              disabled={!timezone}
              className="flex items-center gap-2"
            >
              <Globe size={14} /> Terapkan Timezone
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}

function TimezoneCombobox({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = query
    ? options.filter((tz) => tz.toLowerCase().includes(query.toLowerCase())).slice(0, 15)
    : options.slice(0, 15)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery("")
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  function select(tz: string) {
    onChange(tz)
    setOpen(false)
    setQuery("")
  }

  const displayValue = value.replace(/_/g, " ")

  return (
    <div ref={containerRef} className="relative">
      <label className="text-sm font-semibold text-gray-700 block mb-1.5">Zona Waktu</label>
      <input
        type="text"
        value={open ? query : displayValue}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Cari zona waktu..."
        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 transition-all placeholder:text-gray-400"
      />
      {open && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-4 py-2.5 text-sm text-gray-400">Tidak ditemukan</li>
          ) : (
            filtered.map((tz) => (
              <li
                key={tz}
                onMouseDown={() => select(tz)}
                className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                  tz === value
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {tz.replace(/_/g, " ")}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggleShow,
  error,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggleShow?: () => void
  error?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-3.5 py-2.5 pr-10 border rounded-lg text-sm bg-white transition-all placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 ${error ? "border-red-400 bg-red-50/30" : "border-gray-300"}`}
        />
        {onToggleShow && (
          <button
            type="button"
            onClick={onToggleShow}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600 flex items-center gap-1">⚠ {error}</p>}
    </div>
  )
}
