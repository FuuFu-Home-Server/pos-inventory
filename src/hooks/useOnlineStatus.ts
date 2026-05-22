"use client"

import { useEffect, useState } from "react"

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.getSyncStatus().then((s) => setIsOnline(s.isOnline))
    const unsub = window.electronAPI.onSyncStatus(() => {
      window.electronAPI!.getSyncStatus().then((s) => setIsOnline(s.isOnline))
    })
    return unsub
  }, [])

  return isOnline
}
