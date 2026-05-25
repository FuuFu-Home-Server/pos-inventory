export type SyncStatus = {
  isOnline: boolean
  lastSyncAt: string | null
  pendingCount: number
  failedCount: number
  syncing: boolean
  syncProgress: { done: number; total: number } | null
}

let status: SyncStatus = {
  isOnline: false,
  lastSyncAt: null,
  pendingCount: 0,
  failedCount: 0,
  syncing: false,
  syncProgress: null,
}

let pingInterval: ReturnType<typeof setInterval> | null = null
let onStatusChange: (() => void) | null = null
let remoteBaseUrl = ""
let syncSecret = ""
const localBaseUrl = "http://localhost:3000"

export function startSync(onUpdate: () => void, secret?: string) {
  onStatusChange = onUpdate
  if (secret) syncSecret = secret
  pingInterval = setInterval(checkConnectivity, 30000)
  checkConnectivity()
}

export function stopSync() {
  if (pingInterval) {
    clearInterval(pingInterval)
    pingInterval = null
  }
  onStatusChange = null
}

export function getSyncStatus(): SyncStatus {
  return { ...status }
}

export function setRemoteUrl(url: string) {
  remoteBaseUrl = url
}

export function setSyncSecret(secret: string) {
  syncSecret = secret
}

export async function triggerSync(): Promise<void> {
  if (!remoteBaseUrl || status.syncing) return
  await performSync()
}

export async function triggerPullMirror(): Promise<void> {
  if (!remoteBaseUrl || status.syncing) return
  status.syncing = true
  status.syncProgress = null
  onStatusChange?.()
  try {
    await fetch(`${localBaseUrl}/api/sync/mirror`, { method: "POST" })
    await pullCatalog()
    status.lastSyncAt = new Date().toISOString()
  } catch {
    // silent
  } finally {
    status.syncing = false
    status.syncProgress = null
    onStatusChange?.()
  }
}

export async function triggerPushMirror(): Promise<void> {
  if (!remoteBaseUrl || status.syncing) return
  status.syncing = true
  status.syncProgress = null
  onStatusChange?.()
  try {
    await fetch(`${remoteBaseUrl}/api/sync/wipe`, {
      method: "POST",
      headers: { "X-Sync-Secret": syncSecret },
    })
    const exportRes = await fetch(`${localBaseUrl}/api/sync/export`)
    if (!exportRes.ok) return
    const payload = await exportRes.json()
    await fetch(`${remoteBaseUrl}/api/sync/push`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Sync-Secret": syncSecret },
      body: JSON.stringify(payload),
    })
    status.lastSyncAt = new Date().toISOString()
  } catch {
    // silent
  } finally {
    status.syncing = false
    status.syncProgress = null
    onStatusChange?.()
  }
}

async function checkConnectivity() {
  if (!remoteBaseUrl) return
  try {
    const res = await fetch(`${remoteBaseUrl}/api/health`, {
      signal: AbortSignal.timeout(5000),
    })
    const wasOffline = !status.isOnline
    status.isOnline = res.ok
    if (wasOffline && status.isOnline) await performSync()
    onStatusChange?.()
  } catch {
    status.isOnline = false
    onStatusChange?.()
  }
}

async function performSync() {
  if (status.syncing) return
  status.syncing = true
  status.syncProgress = null
  onStatusChange?.()
  try {
    await flushTransactionQueue()
    await pullCatalog()
    status.lastSyncAt = new Date().toISOString()
  } catch {
    // sync error is silent — status.lastSyncAt stays stale, user sees no lastSyncAt update
  } finally {
    status.syncing = false
    status.syncProgress = null
    onStatusChange?.()
  }
}

async function flushTransactionQueue() {
  const res = await fetch(`${localBaseUrl}/api/sync/pending?limit=100`)
  if (!res.ok) return
  const { transactions, purchaseOrders } = await res.json()
  const txList: unknown[] = transactions ?? []
  const poList: unknown[] = purchaseOrders ?? []
  const total = txList.length + poList.length
  if (total === 0) return

  status.syncProgress = { done: 0, total }
  onStatusChange?.()

  const flushRes = await fetch(`${remoteBaseUrl}/api/sync/flush`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Sync-Secret": syncSecret },
    body: JSON.stringify({ transactions: txList, purchaseOrders: poList }),
  })
  if (!flushRes.ok) return

  const result: {
    synced: string[]
    failed: { localId: string; reason: string }[]
    syncedPo: string[]
    failedPo: { localId: string; reason: string }[]
  } = await flushRes.json()

  status.syncProgress = { done: total, total }
  onStatusChange?.()

  await fetch(`${localBaseUrl}/api/sync/mark`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(result),
  })

  status.pendingCount = 0
  status.failedCount = (status.failedCount ?? 0) + result.failed.length + result.failedPo.length
}

async function pullCatalog() {
  const metaRes = await fetch(`${localBaseUrl}/api/sync/meta`)
  const meta = metaRes.ok ? await metaRes.json() : {}
  const since = meta.lastSyncAt ? `?since=${encodeURIComponent(meta.lastSyncAt)}` : ""

  const catalogRes = await fetch(`${remoteBaseUrl}/api/sync/catalog${since}`, {
    headers: { "X-Sync-Secret": syncSecret },
  })
  if (!catalogRes.ok) return
  const catalog = await catalogRes.json()

  await fetch(`${localBaseUrl}/api/sync/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(catalog),
  })
}
