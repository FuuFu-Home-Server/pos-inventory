type SyncStatus = {
  isOnline: boolean
  lastSyncAt: string | null
  pendingCount: number
  failedCount: number
  syncing: boolean
  syncProgress: { done: number; total: number } | null
  lastError: string | null
}

type AppInfo = { title: string; description: string }
type WindowSettings = {
  width: number
  height: number
  isFullscreen: boolean
  isAlwaysOnTop: boolean
}

interface Window {
  electronAPI?: {
    triggerSync: () => Promise<void>
    triggerPullMirror: () => Promise<void>
    triggerPushMirror: () => Promise<void>
    getSyncStatus: () => Promise<SyncStatus>
    onSyncStatus: (cb: () => void) => () => void
    getRemoteUrl: () => Promise<string>
    setRemoteUrl: (url: string) => Promise<void>
    getSyncSecret: () => Promise<string>
    setSyncSecret: (secret: string) => Promise<{ error?: string }>
    getAppInfo: () => Promise<AppInfo>
    setAppInfo: (info: AppInfo) => Promise<{ ok?: boolean; error?: string }>
    getWindowSettings: () => Promise<WindowSettings>
    setWindowSize: (w: number, h: number) => Promise<void>
    toggleFullscreen: () => Promise<void>
    toggleAlwaysOnTop: () => Promise<void>
    getAutoLaunch: () => Promise<boolean>
    setAutoLaunch: (enabled: boolean) => Promise<void>
    getTimezone: () => Promise<string>
    setTimezone: (tz: string) => Promise<{ ok?: boolean; error?: string }>
  }
}
