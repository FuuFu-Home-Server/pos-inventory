"use client"

import { useEffect, useState } from "react"
import type { SyncStatus } from "../../electron/sync"

const defaultStatus: SyncStatus = {
  isOnline: true,
  lastSyncAt: null,
  pendingCount: 0,
  failedCount: 0,
  syncing: false,
}

export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>(defaultStatus)

  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.getSyncStatus().then(setStatus)
    const unsub = window.electronAPI.onSyncStatus(() => {
      window.electronAPI!.getSyncStatus().then(setStatus)
    })
    return unsub
  }, [])

  const triggerSync = () => window.electronAPI?.triggerSync()

  return { ...status, triggerSync }
}
