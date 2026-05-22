type SyncStatus = {
  isOnline: boolean
  lastSyncAt: string | null
  pendingCount: number
  failedCount: number
  syncing: boolean
}

interface Window {
  electronAPI?: {
    triggerSync: () => Promise<void>
    getSyncStatus: () => Promise<SyncStatus>
    onSyncStatus: (cb: () => void) => () => void
    getRemoteUrl: () => Promise<string>
    setRemoteUrl: (url: string) => Promise<void>
  }
}
