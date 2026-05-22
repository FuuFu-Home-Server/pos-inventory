export type SyncStatus = {
  isOnline: boolean
  lastSyncAt: string | null
  pendingCount: number
  failedCount: number
  syncing: boolean
}

let status: SyncStatus = {
  isOnline: false,
  lastSyncAt: null,
  pendingCount: 0,
  failedCount: 0,
  syncing: false,
}

let pingInterval: ReturnType<typeof setInterval> | null = null
let onStatusChange: (() => void) | null = null
let remoteBaseUrl = ""
const localBaseUrl = "http://localhost:3000"

export function startSync(onUpdate: () => void) {
  onStatusChange = onUpdate
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

export async function triggerSync(): Promise<void> {
  if (!remoteBaseUrl || status.syncing) return
  await performSync()
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
  onStatusChange?.()
  try {
    await flushTransactionQueue()
    await pullCatalog()
    status.lastSyncAt = new Date().toISOString()
  } catch {
    // sync error is silent — status.lastSyncAt stays stale, user sees no lastSyncAt update
  } finally {
    status.syncing = false
    onStatusChange?.()
  }
}

async function flushTransactionQueue() {
  const res = await fetch(`${localBaseUrl}/api/transactions?syncStatus=PENDING&limit=100`)
  if (!res.ok) return
  const { transactions } = await res.json()
  if (!transactions?.length) return

  const flushRes = await fetch(`${remoteBaseUrl}/api/sync/flush`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transactions }),
  })
  if (!flushRes.ok) return

  const result: { synced: string[]; failed: { localId: string; reason: string }[] } =
    await flushRes.json()

  await fetch(`${localBaseUrl}/api/sync/mark`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(result),
  })

  status.pendingCount = 0
  status.failedCount = (status.failedCount ?? 0) + result.failed.length
}

async function pullCatalog() {
  const metaRes = await fetch(`${localBaseUrl}/api/sync/meta`)
  const meta = metaRes.ok ? await metaRes.json() : {}
  const since = meta.lastSyncAt ? `?since=${encodeURIComponent(meta.lastSyncAt)}` : ""

  const catalogRes = await fetch(`${remoteBaseUrl}/api/sync/catalog${since}`)
  if (!catalogRes.ok) return
  const catalog = await catalogRes.json()

  await fetch(`${localBaseUrl}/api/sync/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(catalog),
  })
}
