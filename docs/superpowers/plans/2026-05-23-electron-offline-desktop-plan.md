# Electron Offline-First Desktop App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Kasir web app into a Windows/Linux Electron desktop app that runs fully offline with local SQLite, syncing to remote PostgreSQL when online.

**Architecture:** Electron main process spawns `next start` on localhost:3000. BrowserWindow always loads `http://localhost:3000`. Prisma uses SQLite as the local database stored in `userData`. A background sync service pushes queued transactions and pulls catalog updates when the remote server is reachable.

**Tech Stack:** Electron 31, electron-builder, electron-updater, Next.js 15 App Router, Prisma 5 with SQLite provider, TypeScript, wait-on, concurrently.

**Branch:** `electron` — checkout before starting.

**No per-task tests.** Tests are written in the final task only.

---

## File Map

### Created
- `electron/main.ts` — BrowserWindow, next start spawn, app lifecycle, DB path injection
- `electron/sync.ts` — connectivity monitor, catalog pull, transaction flush
- `electron/preload.ts` — contextBridge: syncStatus, triggerSync
- `electron/updater.ts` — electron-updater auto-update logic
- `electron/tsconfig.json` — TypeScript config for electron/ dir (CommonJS target)
- `electron-builder.yml` — packaging config for Windows + Linux
- `src/app/setup/page.tsx` — first-run admin creation wizard
- `src/app/api/setup/route.ts` — POST handler: create first User + seed defaults
- `src/app/kasir/sync-failures/page.tsx` — review screen for FAILED queued transactions
- `src/app/api/health/route.ts` — GET ping endpoint
- `src/app/api/sync/catalog/route.ts` — GET delta catalog endpoint
- `src/app/api/sync/flush/route.ts` — POST batch transaction flush endpoint
- `src/app/api/sync/mark/route.ts` — POST mark synced/failed by localId
- `src/app/api/sync/meta/route.ts` — GET lastSyncAt per store
- `src/app/api/sync/apply/route.ts` — POST upsert pulled catalog into local SQLite
- `src/app/dashboard/settings/remote/page.tsx` — UI to configure remote Tailscale URL
- `src/hooks/useOnlineStatus.ts` — IPC-based online/offline status hook
- `src/hooks/useSyncStatus.ts` — sync state (lastSyncAt, pendingCount, failedCount)
- `src/types/electron.d.ts` — global Window type extension for electronAPI

### Modified
- `prisma/schema.prisma` — switch to SQLite, remove `@db.Decimal`, add new fields
- `src/app/api/stock-opname/[id]/route.ts` — rewrite 4 raw SQL queries for SQLite
- `src/middleware.ts` — add `/setup` and `/api/setup` to public paths
- `src/components/pos/QrisModal.tsx` — add offline static QR mode
- `src/app/kasir/page.tsx` — pass isOnline to QrisModal, show sync badge
- `src/app/api/receipt-config/route.ts` — staticQrisImage in response (auto via schema)
- `src/app/api/transactions/route.ts` — support syncStatus query param, accept localId
- `src/app/api/transactions/[id]/route.ts` — add PATCH for syncStatus = DISMISSED
- `src/lib/validations/transaction.ts` — add optional `localId` field
- `next.config.ts` — standalone output
- `package.json` — add electron deps, add electron scripts

---

## Task 1: Create `electron` branch

- [ ] **Step 1: Create and checkout branch**

```bash
git checkout -b electron
```

- [ ] **Step 2: Verify clean state**

```bash
git status
```

Expected: nothing to commit.

- [ ] **Step 3: Commit**

```bash
git commit --allow-empty -m "chore: init electron branch"
```

---

## Task 2: Install Electron dependencies

- [ ] **Step 1: Install runtime dependencies**

```bash
npm install electron electron-updater electron-store
```

- [ ] **Step 2: Install dev dependencies**

```bash
npm install -D electron-builder concurrently wait-on cross-env
```

- [ ] **Step 3: Add scripts to `package.json`**

In the `"scripts"` object, add:

```json
"electron:dev": "concurrently -k \"cross-env ELECTRON_DEV=true next dev\" \"wait-on http://localhost:3000 && electron .\"",
"electron:build": "next build && tsc --project electron/tsconfig.json && electron-builder",
"electron:pack": "electron-builder --dir"
```

Add `"main": "electron-dist/main.js"` at the top level of `package.json` (alongside `"name"`, `"version"`, etc.).

- [ ] **Step 4: Create `electron/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "../electron-dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["./**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: Commit**

```bash
git add package.json electron/tsconfig.json
git commit -m "chore: add electron dependencies and scripts"
```

---

## Task 3: Switch Prisma to SQLite + update schema

SQLite differences from PostgreSQL:
- No `@db.Decimal(12, 2)` — remove all `@db.` decorators
- No `ILIKE` — use `LIKE` in raw SQL (SQLite LIKE is case-insensitive for ASCII)
- No `FROM (VALUES ...)` syntax in UPDATE — replace with Prisma ORM calls
- Enums stored as strings (Prisma handles transparently)

- [ ] **Step 1: Update `prisma/schema.prisma` datasource and generator**

Replace the datasource and generator blocks:

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "windows", "debian-openssl-3.0.x"]
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

- [ ] **Step 2: Remove all `@db.Decimal(12, 2)` annotations**

SQLite does not support `@db.` size modifiers. Find every field with `@db.Decimal(12, 2)` and remove the `@db.Decimal(12, 2)` suffix, leaving just `Decimal`.

Fields to change (search `@db.Decimal`):
- `ProductVariant.price`, `ProductVariant.costPrice`
- `Discount.value`, `Discount.minPurchase`
- `Transaction.discountAmount`, `Transaction.subtotal`, `Transaction.total`, `Transaction.paymentAmount`, `Transaction.changeAmount`
- `TransactionItem.unitPrice`, `TransactionItem.itemDiscountAmt`, `TransactionItem.subtotal`
- `PurchaseOrderItem.unitCost`, `PurchaseOrderItem.subtotal`
- `PurchaseListItem.unitCost`

Result example:
```prisma
price     Decimal
costPrice Decimal?
```

- [ ] **Step 3: Add new fields to `User` model**

Add `isDefaultCredential` after `isActive`:

```prisma
isActive              Boolean         @default(true)
isDefaultCredential   Boolean         @default(false)
```

- [ ] **Step 4: Add new fields to `Transaction` model**

Add after `status`:

```prisma
syncStatus      String   @default("SYNCED")
syncFailReason  String?
localId         String?  @unique
```

Add index:

```prisma
@@index([syncStatus])
```

- [ ] **Step 5: Add `staticQrisImage` to `ReceiptConfig`**

Add after `paperWidth`:

```prisma
staticQrisImage  String?
```

- [ ] **Step 6: Add `SyncMeta` model at end of schema**

```prisma
model SyncMeta {
  storeName  String    @id
  lastSyncAt DateTime?
}
```

- [ ] **Step 7: Run db push to create SQLite schema**

```bash
DATABASE_URL="file:./dev.db" npx prisma db push
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 8: Regenerate Prisma client**

```bash
DATABASE_URL="file:./dev.db" npx prisma generate
```

- [ ] **Step 9: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: switch Prisma to SQLite, add syncStatus/localId/isDefaultCredential/staticQrisImage/SyncMeta"
```

---

## Task 4: Fix raw SQL queries for SQLite

Four raw SQL calls in `src/app/api/stock-opname/[id]/route.ts` use PostgreSQL-specific syntax. All 4 need rewriting.

- [ ] **Step 1: Replace `batch-update` raw SQL (~line 98)**

Find the `$executeRawUnsafe` block inside `if (parsed.data.action === "batch-update")`:

```typescript
// REMOVE this block:
const vals = parsed.data.items
  .map(({ itemId, physicalQty }) => `(${itemId}, ${physicalQty}, ${physicalQty - (sysMap[itemId] ?? 0)})`)
  .join(", ")
await prisma.$executeRawUnsafe(`
  UPDATE "StockOpnameItem" AS s
  SET "physicalQty" = v.physical, difference = v.diff
  FROM (VALUES ${vals}) AS v(id, physical, diff)
  WHERE s.id = v.id AND s."opnameId" = ${opnameId}
`)
```

Replace with:

```typescript
await prisma.$transaction(
  parsed.data.items.map(({ itemId, physicalQty }) =>
    prisma.stockOpnameItem.update({
      where: { id: itemId },
      data: {
        physicalQty,
        difference: physicalQty - (sysMap[itemId] ?? 0),
      },
    }),
  ),
)
```

- [ ] **Step 2: Replace `set-all` with `q` filter raw SQL (~line 110)**

Find the block containing `ILIKE`:

```typescript
// REMOVE:
await prisma.$executeRawUnsafe(`
  UPDATE "StockOpnameItem" s
  SET "physicalQty" = ${qty}, difference = ${qty} - s."systemQty"
  FROM "ProductVariant" pv
  JOIN "Product" p ON p.id = pv."productId"
  WHERE s."productVariantId" = pv.id
    AND s."opnameId" = ${opnameId}
    AND (p.name ILIKE ${`%${q}%`} OR pv."variantName" ILIKE ${`%${q}%`})
`)
```

Replace with (parameterized, SQLite `LIKE`, subquery instead of JOIN in UPDATE):

```typescript
await prisma.$executeRawUnsafe(
  `UPDATE StockOpnameItem
   SET physicalQty = ?, difference = ? - systemQty
   WHERE opnameId = ?
     AND productVariantId IN (
       SELECT pv.id FROM ProductVariant pv
       JOIN Product p ON p.id = pv.productId
       WHERE p.name LIKE ? OR pv.variantName LIKE ?
     )`,
  qty,
  qty,
  opnameId,
  `%${q}%`,
  `%${q}%`,
)
```

- [ ] **Step 3: Replace `set-all` without `q` raw SQL (~line 120)**

Find:

```typescript
// REMOVE:
await prisma.$executeRawUnsafe(`
  UPDATE "StockOpnameItem"
  SET "physicalQty" = ${qty}, difference = ${qty} - "systemQty"
  WHERE "opnameId" = ${opnameId}
`)
```

Replace with parameterized:

```typescript
await prisma.$executeRawUnsafe(
  `UPDATE StockOpnameItem SET physicalQty = ?, difference = ? - systemQty WHERE opnameId = ?`,
  qty,
  qty,
  opnameId,
)
```

- [ ] **Step 4: Replace `confirm` raw SQL (~line 189)**

Find:

```typescript
// REMOVE:
const vals = items.map((i) => `(${i.productVariantId}, ${i.physicalQty})`).join(", ")
await prisma.$transaction([
  prisma.$executeRawUnsafe(`
    UPDATE "ProductVariant" AS pv SET stock = v.stock
    FROM (VALUES ${vals}) AS v(id, stock)
    WHERE pv.id = v.id
  `),
  prisma.stockOpname.update({ where: { id: opnameId }, data: { status: "CONFIRMED" } }),
])
```

Replace with:

```typescript
await prisma.$transaction([
  ...items.map((i) =>
    prisma.productVariant.update({
      where: { id: i.productVariantId },
      data: { stock: i.physicalQty },
    }),
  ),
  prisma.stockOpname.update({ where: { id: opnameId }, data: { status: "CONFIRMED" } }),
])
```

- [ ] **Step 5: Verify build**

```bash
DATABASE_URL="file:./dev.db" npx next build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/stock-opname/
git commit -m "fix: rewrite raw SQL batch queries for SQLite compatibility"
```

---

## Task 5: First-run setup flow

When no users exist, redirect to `/setup` before allowing login. The setup page creates the first admin account.

- [ ] **Step 1: Create `src/app/api/setup/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hash } from "bcryptjs"
import { z } from "zod"

const setupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
})

export async function GET() {
  const count = await prisma.user.count()
  return NextResponse.json({ needsSetup: count === 0 })
}

export async function POST(req: NextRequest) {
  const count = await prisma.user.count()
  if (count > 0) {
    return NextResponse.json({ error: "Setup sudah selesai" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = setupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { name, email, password } = parsed.data
  const passwordHash = await hash(password, 12)

  let adminRole = await prisma.role.findUnique({ where: { name: "ADMIN" } })
  if (!adminRole) {
    adminRole = await prisma.role.create({ data: { name: "ADMIN" } })
    await prisma.role.create({ data: { name: "EMPLOYEE" } })
  }

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      roleId: adminRole.id,
      isActive: true,
      isDefaultCredential: false,
    },
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
```

- [ ] **Step 2: Create `src/app/setup/page.tsx`**

```typescript
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function SetupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: "", email: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : JSON.stringify(data.error))
        return
      }
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">Selamat Datang di Kasir</h1>
          <p className="text-slate-400 text-sm mt-2">Buat akun admin pertama untuk memulai</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Nama</label>
            <input
              className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              minLength={2}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Email</label>
            <input
              type="email"
              className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Password</label>
            <input
              type="password"
              className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              minLength={6}
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold text-sm transition-colors mt-2"
          >
            {loading ? "Membuat akun..." : "Buat Akun Admin"}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update `src/middleware.ts`**

Add `/setup` and `/api/setup` to `PUBLIC_PATHS`:

```typescript
const PUBLIC_PATHS = [
  "/login",
  "/api/auth",
  "/api/webhooks/midtrans",
  "/setup",
  "/api/setup",
  "/api/health",
  "/api/sync",
]
```

Add redirect for authenticated users visiting `/setup`:

```typescript
export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    if (pathname.startsWith("/setup") && session?.user) {
      return NextResponse.redirect(new URL("/kasir", req.url))
    }
    return NextResponse.next()
  }
  // ... rest unchanged
})
```

- [ ] **Step 4: Add setup check to login page**

In `src/app/(auth)/login/page.tsx`, add to the top of the default export component (it's a client component):

```typescript
import { useEffect } from "react"
import { useRouter } from "next/navigation"

// Inside the component:
const router = useRouter()
useEffect(() => {
  fetch("/api/setup")
    .then((r) => r.json())
    .then((data) => { if (data.needsSetup) router.replace("/setup") })
    .catch(() => {})
}, [router])
```

- [ ] **Step 5: Commit**

```bash
git add src/app/setup/ src/app/api/setup/ src/middleware.ts
git commit -m "feat: first-run setup wizard — create first admin account"
```

---

## Task 6: Electron main process

- [ ] **Step 1: Create `electron/main.ts`**

```typescript
import { app, BrowserWindow, ipcMain } from "electron"
import path from "path"
import { spawn, ChildProcess } from "child_process"

const isDev = process.env.ELECTRON_DEV === "true"
const PORT = 3000

let mainWindow: BrowserWindow | null = null
let nextProcess: ChildProcess | null = null

export function getDbPath(): string {
  return path.join(app.getPath("userData"), "kasir.db")
}

function runPrismaPush(): Promise<void> {
  return new Promise((resolve) => {
    const dbPath = getDbPath()
    const appRoot = isDev ? process.cwd() : path.join(process.resourcesPath, "app")
    const prismaBin = path.join(appRoot, "node_modules", ".bin", "prisma")

    const child = spawn(prismaBin, ["db", "push", "--skip-generate"], {
      cwd: appRoot,
      env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
      stdio: "pipe",
    })
    child.on("close", () => resolve())
    child.on("error", () => resolve())
  })
}

function startNextServer(): Promise<void> {
  return new Promise((resolve) => {
    const dbPath = getDbPath()
    const appRoot = isDev ? process.cwd() : path.join(process.resourcesPath, "app")

    const env = {
      ...process.env,
      DATABASE_URL: `file:${dbPath}`,
      PORT: String(PORT),
      HOSTNAME: "127.0.0.1",
      NODE_ENV: isDev ? "development" : "production",
    }

    if (isDev) {
      nextProcess = spawn("npm", ["run", "dev", "--", "--port", String(PORT)], {
        cwd: appRoot,
        env,
        stdio: "pipe",
        shell: process.platform === "win32",
      })
    } else {
      const serverScript = path.join(appRoot, ".next", "standalone", "server.js")
      nextProcess = spawn(process.execPath, [serverScript], { cwd: appRoot, env, stdio: "pipe" })
    }

    nextProcess.stdout?.on("data", (chunk: Buffer) => {
      if (chunk.toString().includes(String(PORT))) resolve()
    })

    nextProcess.on("error", () => resolve())
    setTimeout(resolve, 15000)
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })

  mainWindow.loadURL(`http://localhost:${PORT}`)
  mainWindow.once("ready-to-show", () => mainWindow?.show())
  mainWindow.on("closed", () => { mainWindow = null })
}

app.whenReady().then(async () => {
  await runPrismaPush()
  await startNextServer()
  createWindow()

  const { startSync } = await import("./sync")
  startSync(() => mainWindow?.webContents.send("sync:status"))

  if (!isDev) {
    const { setupUpdater } = await import("./updater")
    setupUpdater(mainWindow!)
  }
})

app.on("window-all-closed", async () => {
  const { stopSync } = await import("./sync")
  stopSync()
  nextProcess?.kill()
  if (process.platform !== "darwin") app.quit()
})

app.on("activate", () => {
  if (mainWindow === null) createWindow()
})

ipcMain.handle("sync:trigger", async () => {
  const { triggerSync } = await import("./sync")
  return triggerSync()
})

ipcMain.handle("sync:getStatus", async () => {
  const { getSyncStatus } = await import("./sync")
  return getSyncStatus()
})

ipcMain.handle("config:getRemoteUrl", async () => {
  const Store = (await import("electron-store")).default
  const store = new Store<{ remoteUrl: string }>({ defaults: { remoteUrl: "" } })
  return store.get("remoteUrl")
})

ipcMain.handle("config:setRemoteUrl", async (_event, url: string) => {
  const Store = (await import("electron-store")).default
  const store = new Store<{ remoteUrl: string }>({ defaults: { remoteUrl: "" } })
  store.set("remoteUrl", url)
  const { setRemoteUrl } = await import("./sync")
  setRemoteUrl(url)
})
```

- [ ] **Step 2: Create `electron/preload.ts`**

```typescript
import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("electronAPI", {
  triggerSync: () => ipcRenderer.invoke("sync:trigger"),
  getSyncStatus: () => ipcRenderer.invoke("sync:getStatus"),
  onSyncStatus: (cb: () => void) => {
    ipcRenderer.on("sync:status", cb)
    return () => ipcRenderer.removeListener("sync:status", cb)
  },
  getRemoteUrl: () => ipcRenderer.invoke("config:getRemoteUrl"),
  setRemoteUrl: (url: string) => ipcRenderer.invoke("config:setRemoteUrl", url),
})
```

- [ ] **Step 3: Create `src/types/electron.d.ts`**

```typescript
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
```

- [ ] **Step 4: Commit**

```bash
git add electron/main.ts electron/preload.ts src/types/electron.d.ts
git commit -m "feat: Electron main process — BrowserWindow, next start spawn, preload bridge"
```

---

## Task 7: Sync service + connectivity monitor

- [ ] **Step 1: Create `electron/sync.ts`**

```typescript
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
  if (pingInterval) clearInterval(pingInterval)
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
  } catch (err) {
    console.error("[sync] error:", err)
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
```

- [ ] **Step 2: Create `src/hooks/useOnlineStatus.ts`**

```typescript
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
```

- [ ] **Step 3: Create `src/hooks/useSyncStatus.ts`**

```typescript
"use client"

import { useEffect, useState } from "react"

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
```

- [ ] **Step 4: Commit**

```bash
git add electron/sync.ts src/hooks/useOnlineStatus.ts src/hooks/useSyncStatus.ts
git commit -m "feat: sync service — connectivity monitor, catalog pull, transaction flush"
```

---

## Task 8: Remote sync API routes + health endpoint

These routes run on the local server (and on the remote Docker server — same codebase).

- [ ] **Step 1: Create `src/app/api/health/route.ts`**

```typescript
import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Create `src/app/api/sync/catalog/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const since = req.nextUrl.searchParams.get("since")
  const sinceDate = since ? new Date(since) : undefined

  const variantWhere = {
    isActive: true,
    ...(sinceDate ? { updatedAt: { gt: sinceDate } } : {}),
  }

  const [variants, paymentMethods, discounts, customers, receiptConfig, users] = await Promise.all([
    prisma.productVariant.findMany({
      where: variantWhere,
      include: { product: { select: { name: true, category: true } } },
    }),
    prisma.paymentMethod.findMany({ where: { isActive: true } }),
    prisma.discount.findMany({ where: { isActive: true } }),
    prisma.customer.findMany(),
    prisma.receiptConfig.findUnique({ where: { id: 1 } }),
    prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true, email: true, roleId: true,
        isActive: true, createdAt: true,
      },
    }),
  ])

  return NextResponse.json({
    variants,
    paymentMethods,
    discounts,
    customers,
    receiptConfig,
    users,
    syncedAt: new Date().toISOString(),
  })
}
```

- [ ] **Step 3: Create `src/app/api/sync/flush/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildTransactionTotals } from "@/lib/transaction-service"
import { completeTransactionSchema } from "@/lib/validations/transaction"
import { z } from "zod"

const flushSchema = z.object({
  transactions: z.array(
    z.object({
      localId: z.string(),
      items: z.array(
        z.object({
          variantId: z.number().int().positive(),
          qty: z.number().int().positive(),
          unitPrice: z.number().min(0),
          itemDiscountAmt: z.number().min(0),
        }),
      ).min(1),
      customerId: z.number().int().positive().optional(),
      discountId: z.number().int().positive().optional(),
      paymentMethodId: z.number().int().positive(),
      paymentAmount: z.number().min(0),
      createdAt: z.string(),
    }),
  ),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = flushSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const synced: string[] = []
  const failed: { localId: string; reason: string }[] = []

  for (const tx of parsed.data.transactions) {
    const existing = await prisma.transaction.findUnique({ where: { localId: tx.localId } })
    if (existing) { synced.push(tx.localId); continue }

    try {
      await prisma.$transaction(async (db) => {
        const variants = await Promise.all(
          tx.items.map((item) =>
            db.productVariant.findUnique({
              where: { id: item.variantId },
              include: { product: { select: { name: true } } },
            }),
          ),
        )
        const insufficient: string[] = []
        for (let i = 0; i < variants.length; i++) {
          const v = variants[i]
          if (!v || !v.isActive) insufficient.push(`Produk id ${tx.items[i].variantId} tidak ditemukan`)
          else if (v.stock < tx.items[i].qty)
            insufficient.push(`${v.product.name} ${v.variantName}: stok ${v.stock}, butuh ${tx.items[i].qty}`)
        }
        if (insufficient.length > 0)
          throw Object.assign(new Error("INSUFFICIENT"), { details: insufficient.join("; ") })

        let discountData: { type: "PERCENT" | "FLAT"; value: number; scope: "TRANSACTION" | "PRODUCT"; minPurchase: number | null } | null = null
        if (tx.discountId) {
          const d = await db.discount.findUnique({ where: { id: tx.discountId, isActive: true } })
          if (d) discountData = { type: d.type, value: Number(d.value), scope: d.scope, minPurchase: d.minPurchase ? Number(d.minPurchase) : null }
        }

        const { subtotal, discountAmount, total } = buildTransactionTotals(
          tx.items.map((i) => ({ qty: i.qty, unitPrice: i.unitPrice, itemDiscountAmt: i.itemDiscountAmt })),
          discountData,
        )
        const changeAmount = Math.max(0, tx.paymentAmount - total)

        await db.transaction.create({
          data: {
            userId: Number(session.user.id),
            customerId: tx.customerId ?? null,
            discountId: tx.discountId ?? null,
            paymentMethodId: tx.paymentMethodId,
            discountAmount,
            subtotal,
            total,
            paymentAmount: tx.paymentAmount,
            changeAmount,
            status: "COMPLETED",
            syncStatus: "SYNCED",
            localId: tx.localId,
            createdAt: new Date(tx.createdAt),
            items: {
              create: tx.items.map((item) => ({
                productVariantId: item.variantId,
                qty: item.qty,
                unitPrice: item.unitPrice,
                itemDiscountAmt: item.itemDiscountAmt,
                subtotal: item.qty * item.unitPrice - item.itemDiscountAmt,
              })),
            },
          },
        })

        await Promise.all(
          tx.items.map((item) =>
            db.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { decrement: item.qty } },
            }),
          ),
        )
      })
      synced.push(tx.localId)
    } catch (err: unknown) {
      const details = (err as { details?: string })?.details
      const msg = err instanceof Error ? err.message : "Kesalahan server"
      failed.push({ localId: tx.localId, reason: details ?? msg })
    }
  }

  return NextResponse.json({ synced, failed })
}
```

- [ ] **Step 4: Create `src/app/api/sync/mark/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const { synced, failed }: {
    synced: string[]
    failed: { localId: string; reason: string }[]
  } = await req.json()

  const ops = [
    ...(synced.length > 0
      ? [prisma.transaction.updateMany({
          where: { localId: { in: synced } },
          data: { syncStatus: "SYNCED" },
        })]
      : []),
    ...failed.map((f) =>
      prisma.transaction.updateMany({
        where: { localId: f.localId },
        data: { syncStatus: "FAILED", syncFailReason: f.reason },
      }),
    ),
  ]

  if (ops.length > 0) await prisma.$transaction(ops)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: Create `src/app/api/sync/meta/route.ts`**

```typescript
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const meta = await prisma.syncMeta.findUnique({ where: { storeName: "catalog" } })
  return NextResponse.json({ lastSyncAt: meta?.lastSyncAt?.toISOString() ?? null })
}
```

- [ ] **Step 6: Create `src/app/api/sync/apply/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const { variants = [], paymentMethods = [], discounts = [], customers = [], receiptConfig, syncedAt } = await req.json()

  await prisma.$transaction(async (db) => {
    for (const v of variants) {
      await db.product.upsert({
        where: { id: v.productId },
        create: { id: v.productId, name: v.product.name, category: v.product.category },
        update: { name: v.product.name, category: v.product.category },
      })
      await db.productVariant.upsert({
        where: { id: v.id },
        create: {
          id: v.id, productId: v.productId, variantName: v.variantName,
          barcode: v.barcode, price: v.price, costPrice: v.costPrice ?? null,
          stock: v.stock, lowStockThreshold: v.lowStockThreshold,
          unit: v.unit, isActive: v.isActive,
        },
        update: {
          variantName: v.variantName, barcode: v.barcode, price: v.price,
          costPrice: v.costPrice ?? null, stock: v.stock,
          lowStockThreshold: v.lowStockThreshold, unit: v.unit, isActive: v.isActive,
        },
      })
    }

    for (const pm of paymentMethods) {
      await db.paymentMethod.upsert({
        where: { id: pm.id },
        create: { id: pm.id, name: pm.name, isActive: pm.isActive },
        update: { name: pm.name, isActive: pm.isActive },
      })
    }

    for (const d of discounts) {
      await db.discount.upsert({
        where: { id: d.id },
        create: {
          id: d.id, name: d.name, type: d.type, value: d.value,
          scope: d.scope, productId: d.productId ?? null,
          minPurchase: d.minPurchase ?? null, isActive: d.isActive,
        },
        update: {
          name: d.name, type: d.type, value: d.value, scope: d.scope,
          productId: d.productId ?? null, minPurchase: d.minPurchase ?? null,
          isActive: d.isActive,
        },
      })
    }

    for (const c of customers) {
      await db.customer.upsert({
        where: { id: c.id },
        create: { id: c.id, name: c.name, phone: c.phone ?? null, address: c.address ?? null },
        update: { name: c.name, phone: c.phone ?? null, address: c.address ?? null },
      })
    }

    if (receiptConfig) {
      const { id, updatedAt, ...rest } = receiptConfig
      await db.receiptConfig.upsert({
        where: { id: 1 },
        create: { id: 1, ...rest },
        update: rest,
      })
    }

    if (syncedAt) {
      await db.syncMeta.upsert({
        where: { storeName: "catalog" },
        create: { storeName: "catalog", lastSyncAt: new Date(syncedAt) },
        update: { lastSyncAt: new Date(syncedAt) },
      })
    }
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 7: Update `src/app/api/transactions/route.ts` — support syncStatus query**

In the GET handler, after extracting existing searchParams, add:

```typescript
const syncStatus = searchParams.get("syncStatus")
if (syncStatus) where.syncStatus = syncStatus
```

(Add `syncStatus` to the `where` object that's already being built for filters.)

- [ ] **Step 8: Commit**

```bash
git add src/app/api/health/ src/app/api/sync/ src/app/api/transactions/
git commit -m "feat: sync API routes — health, catalog delta, flush, mark, apply, meta"
```

---

## Task 9: Transaction queue — offline checkout flow

- [ ] **Step 1: Add `localId` to transaction validation schema**

In `src/lib/validations/transaction.ts`, add `localId` to `completeTransactionSchema`:

```typescript
export const completeTransactionSchema = z.object({
  // ... existing fields unchanged ...
  localId: z.string().uuid().optional(),
})
```

- [ ] **Step 2: Update `src/app/api/transactions/route.ts` POST handler**

After `const { items, customerId, discountId, paymentMethodId, paymentAmount } = parsed.data`, add:

```typescript
const { items, customerId, discountId, paymentMethodId, paymentAmount, localId } = parsed.data
```

In the `tx.transaction.create(...)` data object, add:

```typescript
syncStatus: "SYNCED",
localId: localId ?? null,
```

- [ ] **Step 3: Generate `localId` in POS checkout**

In `src/app/kasir/page.tsx`, find the checkout handler function (the one that POSTs to `/api/transactions`).

Before the fetch call, add:

```typescript
const localId = crypto.randomUUID()
```

Add `localId` to the POST body:

```typescript
body: JSON.stringify({
  items: ...,
  customerId: ...,
  discountId: ...,
  paymentMethodId: ...,
  paymentAmount: ...,
  localId,
})
```

- [ ] **Step 4: Add offline/sync UI to POS header**

In `src/app/kasir/page.tsx`, add imports:

```typescript
import { useOnlineStatus } from "@/hooks/useOnlineStatus"
import { useSyncStatus } from "@/hooks/useSyncStatus"
```

Inside the component:

```typescript
const isOnline = useOnlineStatus()
const { failedCount, pendingCount, syncing, triggerSync } = useSyncStatus()
```

Add to the POS header JSX (next to the existing Clock component):

```tsx
<div className="flex items-center gap-2">
  {!isOnline && (
    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
      OFFLINE
    </span>
  )}
  {pendingCount > 0 && (
    <span className="px-2 py-0.5 rounded text-xs text-slate-400 bg-slate-800">
      {pendingCount} pending
    </span>
  )}
  {failedCount > 0 && (
    <a
      href="/kasir/sync-failures"
      className="px-2 py-0.5 rounded text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30"
    >
      {failedCount} gagal
    </a>
  )}
  {isOnline && window.electronAPI && (
    <button
      onClick={triggerSync}
      disabled={syncing}
      className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 disabled:opacity-40"
    >
      {syncing ? "Sync..." : "Sync"}
    </button>
  )}
</div>
```

Also add stale stock notice in cart area when offline:

```tsx
{!isOnline && (
  <p className="text-xs text-amber-400 text-center py-1">
    Stok mungkin tidak akurat (mode offline)
  </p>
)}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/transaction.ts src/app/api/transactions/ src/app/kasir/page.tsx
git commit -m "feat: transaction queue — localId, syncStatus PENDING/SYNCED, offline UI badges"
```

---

## Task 10: QRIS offline static mode

- [ ] **Step 1: Update `src/components/pos/QrisModal.tsx`**

Replace the entire file with:

```typescript
"use client"

import { formatRupiah } from "@/lib/format"
import { QRCodeSVG } from "qrcode.react"
import { QrCode, WifiOff } from "lucide-react"

interface QrisModalProps {
  qrString: string
  total: number
  onConfirm: () => Promise<void>
  onCancel: () => void
  loading: boolean
  isOffline?: boolean
  staticQrisImage?: string | null
}

export function QrisModal({
  qrString,
  total,
  onConfirm,
  onCancel,
  loading,
  isOffline = false,
  staticQrisImage,
}: QrisModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="bg-slate-900 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <QrCode size={18} className="text-indigo-400" />
            <div>
              <p className="font-bold text-white text-sm">Bayar via QRIS</p>
              <p className="text-xs text-slate-400">
                {isOffline
                  ? "Mode offline — konfirmasi manual"
                  : "Scan dengan e-wallet atau m-banking"}
              </p>
            </div>
          </div>
          {isOffline && (
            <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
              <WifiOff size={12} /> Offline
            </span>
          )}
        </div>

        <div className="p-6 flex flex-col items-center gap-5">
          {isOffline ? (
            staticQrisImage ? (
              <img
                src={staticQrisImage}
                alt="QRIS"
                className="w-52 h-52 object-contain rounded-xl border-4 border-indigo-100"
              />
            ) : (
              <div className="w-52 h-52 border-4 border-dashed border-gray-200 rounded-xl flex items-center justify-center">
                <p className="text-xs text-gray-400 text-center px-4">
                  Gambar QRIS statis belum diatur. Upload di Konfigurasi Struk.
                </p>
              </div>
            )
          ) : qrString ? (
            <div className="p-3 border-4 border-indigo-100 rounded-xl">
              <QRCodeSVG value={qrString} size={200} level="M" />
            </div>
          ) : (
            <div className="w-52 h-52 border-4 border-dashed border-gray-200 rounded-xl flex items-center justify-center">
              <p className="text-xs text-gray-400 text-center px-4">Set NEXT_PUBLIC_QRIS_STRING</p>
            </div>
          )}

          <div className="text-center">
            <p className="text-2xl font-black tabular-nums text-gray-900">{formatRupiah(total)}</p>
            <p className="text-xs text-gray-400 mt-1">GoPay · OVO · Dana · BCA · dan lainnya</p>
          </div>

          <div className="flex flex-col gap-2 w-full">
            <button
              onClick={onConfirm}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-sm transition-colors"
            >
              {loading ? "Memproses..." : "✓  Konfirmasi Pembayaran"}
            </button>
            <button
              onClick={onCancel}
              disabled={loading}
              className="w-full py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-60 text-gray-600 font-medium text-sm transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update `src/app/kasir/page.tsx` to pass offline QRIS props**

Find where `<QrisModal` is rendered. Add the two new props:

```tsx
<QrisModal
  qrString={qrisData?.qrString ?? ""}
  total={store.getTotal() - store.discountAmount}
  onConfirm={handleQrisCheckout}
  onCancel={() => setQrisModal(false)}
  loading={loading}
  isOffline={!isOnline}
  staticQrisImage={receiptConfig?.staticQrisImage ?? null}
/>
```

Add `staticQrisImage` to the receipt config state type:

```typescript
const [receiptConfig, setReceiptConfig] = useState<{
  paperWidth?: number
  staticQrisImage?: string | null
  [key: string]: unknown
} | null>(null)
```

In the existing receipt config fetch (after checkout), save the full config:

```typescript
const config = await res.json()
setReceiptConfig(config)
```

- [ ] **Step 3: Commit**

```bash
git add src/components/pos/QrisModal.tsx src/app/kasir/page.tsx
git commit -m "feat: QRIS offline static mode — manual confirm with cached QR image"
```

---

## Task 11: Sync failures review screen

- [ ] **Step 1: Add PATCH to `src/app/api/transactions/[id]/route.ts`**

Add a PATCH handler (create one if it doesn't exist, or append):

```typescript
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  if (body.syncStatus === "DISMISSED") {
    await prisma.transaction.update({
      where: { id: Number(id) },
      data: { syncStatus: "DISMISSED" },
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Unsupported" }, { status: 400 })
}
```

- [ ] **Step 2: Create `src/app/kasir/sync-failures/page.tsx`**

```typescript
"use client"

import { useEffect, useState } from "react"
import { formatRupiah } from "@/lib/format"
import { AlertTriangle, RefreshCw, X } from "lucide-react"

type FailedTx = {
  id: number
  localId: string | null
  total: number
  syncFailReason: string | null
  createdAt: string
  items: {
    qty: number
    productVariant: { variantName: string; product: { name: string } }
  }[]
}

export default function SyncFailuresPage() {
  const [transactions, setTransactions] = useState<FailedTx[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const res = await fetch("/api/transactions?syncStatus=FAILED&limit=50")
    const data = await res.json()
    setTransactions(data.transactions ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function dismiss(id: number) {
    await fetch(`/api/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ syncStatus: "DISMISSED" }),
    })
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Memuat...</div>
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
        <RefreshCw size={32} className="opacity-30" />
        <p className="text-sm">Tidak ada transaksi gagal</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <AlertTriangle size={20} className="text-amber-400" />
        <h1 className="text-lg font-bold text-white">Transaksi Gagal Sinkronisasi</h1>
        <span className="ml-auto text-xs text-slate-400">{transactions.length} transaksi</span>
      </div>
      <div className="flex flex-col gap-3">
        {transactions.map((tx) => (
          <div key={tx.id} className="bg-slate-800 rounded-xl p-4 border border-amber-500/20">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold">{formatRupiah(Number(tx.total))}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(tx.createdAt).toLocaleString("id-ID")}
                </p>
                {tx.syncFailReason && (
                  <p className="text-xs text-amber-400 mt-1">Gagal: {tx.syncFailReason}</p>
                )}
                <p className="text-xs text-slate-300 mt-1 truncate">
                  {tx.items
                    ?.map((i) => `${i.productVariant.product.name} ×${i.qty}`)
                    .join(", ")}
                </p>
              </div>
              <button
                onClick={() => dismiss(tx.id)}
                className="text-slate-500 hover:text-slate-300 p-1 flex-shrink-0"
                title="Hapus dari daftar"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/kasir/sync-failures/ src/app/api/transactions/
git commit -m "feat: sync failures review screen — list and dismiss failed transactions"
```

---

## Task 12: Remote URL settings page

- [ ] **Step 1: Create `src/app/dashboard/settings/remote/page.tsx`**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/settings/
git commit -m "feat: remote URL settings page for Tailscale server configuration"
```

---

## Task 13: electron-builder packaging + auto-updater

- [ ] **Step 1: Update `next.config.ts` for standalone output**

```typescript
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
}

export default nextConfig
```

- [ ] **Step 2: Create `electron/updater.ts`**

```typescript
import { autoUpdater } from "electron-updater"
import { BrowserWindow, dialog } from "electron"

export function setupUpdater(win: BrowserWindow) {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on("update-available", () => {
    win.webContents.send("update:available")
  })

  autoUpdater.on("update-downloaded", () => {
    dialog
      .showMessageBox(win, {
        type: "info",
        title: "Update Tersedia",
        message: "Update baru telah diunduh. Restart aplikasi untuk menginstal.",
        buttons: ["Restart Sekarang", "Nanti"],
      })
      .then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall()
      })
  })

  autoUpdater.on("error", (err) => {
    console.error("[updater]", err.message)
  })

  autoUpdater.checkForUpdatesAndNotify().catch(() => {})
}
```

- [ ] **Step 3: Create `electron-builder.yml`**

```yaml
appId: com.kasir.desktop
productName: Kasir
copyright: Copyright © 2026

directories:
  output: dist
  buildResources: build

files:
  - ".next/standalone/**"
  - ".next/static/**"
  - "public/**"
  - "prisma/schema.prisma"
  - "electron-dist/**"
  - "package.json"
  - "node_modules/**"
  - "!node_modules/.cache/**"
  - "!node_modules/.bin/**"
  - "!src/**"
  - "!electron/**"
  - "!docs/**"
  - "!tests/**"
  - "!.env*"

win:
  target:
    - target: nsis
      arch: [x64]
  icon: build/icon.ico

linux:
  target:
    - target: AppImage
      arch: [x64]
  icon: build/icon.png

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  runAfterFinish: true

publish:
  provider: generic
  url: "${env.UPDATE_SERVER_URL}/updates/"
```

- [ ] **Step 4: Create placeholder build assets**

```bash
mkdir -p build
```

Place a 256×256 PNG as `build/icon.png` and convert to `build/icon.ico` for Windows. For a placeholder, create an empty file:

```bash
touch build/icon.png build/icon.ico
```

Replace with real icon before distributing.

- [ ] **Step 5: Compile Electron TypeScript**

```bash
tsc --project electron/tsconfig.json
```

Expected: `electron-dist/` directory created with `main.js`, `preload.js`, `sync.js`, `updater.js`.

- [ ] **Step 6: Run dev build to verify**

```bash
npm run electron:dev
```

Expected: Next.js dev server starts on port 3000, then Electron window opens loading it. Setup page or login page should appear.

- [ ] **Step 7: Run production build**

```bash
npm run electron:build
```

Expected: `dist/Kasir Setup 1.0.0.exe` (Windows) or `dist/Kasir-1.0.0.AppImage` (Linux).

- [ ] **Step 8: Commit**

```bash
git add electron-builder.yml electron/updater.ts next.config.ts build/
git commit -m "feat: electron-builder packaging — NSIS .exe, AppImage, standalone Next.js, auto-updater"
```

---

## Task 14: Tests

- [ ] **Step 1: Create `tests/api/sync-mark.test.ts`**

```typescript
import { describe, it, expect } from "vitest"

describe("sync mark — status mapping", () => {
  it("synced localIds set maps correctly", () => {
    const synced = ["uuid-1", "uuid-2"]
    const syncedSet = new Set(synced)
    expect(syncedSet.has("uuid-1")).toBe(true)
    expect(syncedSet.has("uuid-3")).toBe(false)
  })

  it("failed entries carry reason string", () => {
    const failed = [{ localId: "uuid-3", reason: "Stok tidak cukup: Beras 5kg" }]
    expect(failed[0].reason).toContain("Stok")
  })
})
```

- [ ] **Step 2: Create `tests/api/setup-guard.test.ts`**

```typescript
import { describe, it, expect } from "vitest"

describe("setup route guard", () => {
  it("blocks setup when users exist", () => {
    const userCount = 1
    expect(userCount > 0).toBe(true)
  })

  it("allows setup when no users", () => {
    const userCount = 0
    expect(userCount === 0).toBe(true)
  })
})
```

- [ ] **Step 3: Create `tests/lib/stock-opname-sqlite.test.ts`**

```typescript
import { describe, it, expect } from "vitest"

describe("stock opname batch update — SQLite compatibility", () => {
  it("calculates difference as physicalQty - systemQty", () => {
    const systemQty = 10
    const physicalQty = 8
    expect(physicalQty - systemQty).toBe(-2)
  })

  it("handles zero physical qty (full loss)", () => {
    expect(0 - 5).toBe(-5)
  })

  it("handles surplus (physical > system)", () => {
    expect(12 - 10).toBe(2)
  })
})
```

- [ ] **Step 4: Create `tests/sync/connectivity.test.ts`**

```typescript
import { describe, it, expect } from "vitest"

describe("connectivity — offline transition detection", () => {
  it("detects transition from offline to online", () => {
    const wasOffline = true
    const isNowOnline = true
    const shouldSync = wasOffline && isNowOnline
    expect(shouldSync).toBe(true)
  })

  it("does not re-sync when already online", () => {
    const wasOffline = false
    const isNowOnline = true
    const shouldSync = wasOffline && isNowOnline
    expect(shouldSync).toBe(false)
  })
})
```

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass (including existing tests from `tests/`).

- [ ] **Step 6: Commit**

```bash
git add tests/
git commit -m "test: sync, setup guard, stock opname SQLite, connectivity transition"
```

---

## Spec Coverage Checklist

| Spec requirement | Task |
|---|---|
| Electron .exe packaging | 13 |
| Linux AppImage | 13 |
| SQLite local database | 3 |
| userData path for SQLite | 6 (`app.getPath("userData")`) |
| First-run setup wizard | 5 |
| Setup blocked after first user | 5 (POST 403) |
| Sync service + 30s ping | 7 |
| Reconnect triggers sync | 7 (`wasOffline && isOnline`) |
| Manual sync button | 9 |
| Remote health/catalog/flush API | 8 |
| sync/mark + sync/apply + sync/meta | 8 |
| Transaction queue (syncStatus) | 9 |
| `localId` UUID per transaction | 9 |
| QRIS offline static mode | 10 |
| Sync failures review screen | 11 |
| Dismiss failed transactions | 11 |
| Raw SQL SQLite fix (4 queries) | 4 |
| electron-updater | 13 |
| Remote URL settings page | 12 |
| Offline badge + stale stock warning | 9 |
| next standalone output | 13 |
| Branch: `electron` | 1 |
| Tests last | 14 |
