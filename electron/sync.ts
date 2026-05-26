export type SyncStatus = {
  isOnline: boolean
  lastSyncAt: string | null
  pendingCount: number
  failedCount: number
  syncing: boolean
  syncProgress: { done: number; total: number } | null
  lastError: string | null
}

let status: SyncStatus = {
  isOnline: false,
  lastSyncAt: null,
  pendingCount: 0,
  failedCount: 0,
  syncing: false,
  syncProgress: null,
  lastError: null,
}

let pingInterval: ReturnType<typeof setInterval> | null = null
let pushInterval: ReturnType<typeof setInterval> | null = null
let onStatusChange: (() => void) | null = null
let remoteBaseUrl = ""
let syncSecret = ""
const localBaseUrl = "http://localhost:3000"
const PUSH_INTERVAL_MS = 15 * 60 * 1000

export function startSync(onUpdate: () => void, secret?: string) {
  onStatusChange = onUpdate
  if (secret) syncSecret = secret
  pingInterval = setInterval(checkConnectivity, 30000)
  pushInterval = setInterval(() => {
    if (status.isOnline && remoteBaseUrl) performSync()
  }, PUSH_INTERVAL_MS)
  checkConnectivity()
}

export function stopSync() {
  if (pingInterval) {
    clearInterval(pingInterval)
    pingInterval = null
  }
  if (pushInterval) {
    clearInterval(pushInterval)
    pushInterval = null
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
  if (!remoteBaseUrl) {
    status.lastError = "Remote URL belum dikonfigurasi"
    onStatusChange?.()
    return
  }
  if (status.syncing) return
  await performSync()
}

export async function triggerPullMirror(): Promise<void> {
  if (!remoteBaseUrl) {
    status.lastError = "Remote URL belum dikonfigurasi"
    onStatusChange?.()
    return
  }
  if (status.syncing) return
  status.syncing = true
  status.syncProgress = null
  status.lastError = null
  onStatusChange?.()
  try {
    await fetch(`${localBaseUrl}/api/sync/mirror`, { method: "POST" })
    await pullCatalog()
    status.lastSyncAt = new Date().toISOString()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[sync] triggerPullMirror error:", msg)
    status.lastError = msg
  } finally {
    status.syncing = false
    status.syncProgress = null
    onStatusChange?.()
  }
}

export async function triggerPushMirror(): Promise<void> {
  if (!remoteBaseUrl) {
    status.lastError = "Remote URL belum dikonfigurasi"
    onStatusChange?.()
    return
  }
  if (status.syncing) return
  status.syncing = true
  status.syncProgress = null
  status.lastError = null
  onStatusChange?.()
  try {
    const wipeRes = await fetch(`${remoteBaseUrl}/api/sync/wipe`, {
      method: "POST",
      headers: { "X-Sync-Secret": syncSecret },
    })
    if (!wipeRes.ok) throw new Error(`wipe failed: ${wipeRes.status} ${await wipeRes.text()}`)
    const exportRes = await fetch(`${localBaseUrl}/api/sync/export`)
    if (!exportRes.ok) throw new Error(`export failed: ${exportRes.status}`)
    const payload = await exportRes.json()
    const pushRes = await fetch(`${remoteBaseUrl}/api/sync/push`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Sync-Secret": syncSecret },
      body: JSON.stringify(payload),
    })
    if (!pushRes.ok) throw new Error(`push failed: ${pushRes.status} ${await pushRes.text()}`)
    status.lastSyncAt = new Date().toISOString()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[sync] triggerPushMirror error:", msg)
    status.lastError = msg
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
  status.lastError = null
  onStatusChange?.()
  try {
    await flushTransactionQueue()
    await pushCatalogToServer()
    status.lastSyncAt = new Date().toISOString()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[sync] performSync error:", msg)
    status.lastError = msg
  } finally {
    status.syncing = false
    status.syncProgress = null
    onStatusChange?.()
  }
}

async function flushTransactionQueue() {
  const res = await fetch(`${localBaseUrl}/api/sync/pending?limit=100`)
  if (!res.ok) throw new Error(`pending fetch failed: ${res.status}`)
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
  if (!flushRes.ok) throw new Error(`flush failed: ${flushRes.status} ${await flushRes.text()}`)

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

async function pushCatalogToServer() {
  const metaRes = await fetch(`${localBaseUrl}/api/sync/meta`)
  const meta = metaRes.ok ? await metaRes.json() : {}
  const since = meta.lastPushAt ? `?since=${encodeURIComponent(meta.lastPushAt)}` : ""

  const exportRes = await fetch(`${localBaseUrl}/api/sync/export${since}`)
  if (!exportRes.ok) throw new Error(`export failed: ${exportRes.status}`)
  const payload = await exportRes.json()

  const pushRes = await fetch(`${remoteBaseUrl}/api/sync/push`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Sync-Secret": syncSecret },
    body: JSON.stringify(payload),
  })
  if (!pushRes.ok) throw new Error(`push failed: ${pushRes.status} ${await pushRes.text()}`)

  const syncedAt = new Date().toISOString()
  await fetch(`${localBaseUrl}/api/sync/meta`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storeName: "catalog-push", syncedAt }),
  })
}

async function pullCatalog() {
  const metaRes = await fetch(`${localBaseUrl}/api/sync/meta`)
  const meta = metaRes.ok ? await metaRes.json() : {}
  const since = meta.lastSyncAt ? `?since=${encodeURIComponent(meta.lastSyncAt)}` : ""

  const catalogRes = await fetch(`${remoteBaseUrl}/api/sync/catalog${since}`, {
    headers: { "X-Sync-Secret": syncSecret },
  })
  if (!catalogRes.ok)
    throw new Error(`catalog fetch failed: ${catalogRes.status} ${await catalogRes.text()}`)
  const catalog = await catalogRes.json()

  await fetch(`${localBaseUrl}/api/sync/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(catalog),
  })
}
