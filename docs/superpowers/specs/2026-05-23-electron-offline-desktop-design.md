# Kasir Desktop App — Electron Offline-First Design

**Date:** 2026-05-23  
**Branch:** `electron`  
**Status:** Draft

---

## Overview

Convert the existing Next.js web app into an Electron desktop application (.exe for Windows, AppImage for Linux). The app runs fully offline-first: local SQLite is the primary database, remote PostgreSQL is a sync target only. When online, the app syncs bidirectionally in the background.

---

## Goals

- App works completely offline (no internet required for daily operation)
- All features available: POS, dashboard, inventory, reports
- Background sync when Tailscale/internet is available
- Offline transactions queued locally, flushed on reconnect
- Stock accuracy maintained via server-authoritative conflict resolution
- First-run setup wizard with default credentials

---

## Architecture

### Runtime

```
Electron main process
├── spawns: next start (localhost:3000)  ← full Next.js app
├── manages: SQLite via Prisma (local)
├── runs: sync service (background)
└── BrowserWindow always loads http://localhost:3000
```

No remote URL loading. App always runs locally. Remote PostgreSQL contacted only during sync.

### Database

| Environment | Provider | Location |
|---|---|---|
| Desktop app | SQLite | `app.getPath('userData')/kasir.db` |
| Remote server | PostgreSQL | Docker container (Tailscale home server) |

Prisma schema switches to SQLite provider for the desktop build. Same models, same queries — except raw SQL batch ops (see Breaking Changes).

### Data flow

```
User action → Next.js API route → Prisma → local SQLite
                                               ↕ (when online)
                                         Sync service
                                               ↕
                                      Remote PostgreSQL
```

---

## First-Run Setup

On fresh install, SQLite is empty. App detects no users exist → shows setup wizard.

**Flow:**
1. App launches → checks `SELECT COUNT(*) FROM User`
2. If 0 users → redirect to `/setup` (before login)
3. `/setup` page: create first admin account (name, username, password)
4. On submit → create User with role ADMIN → redirect to `/login`
5. `/setup` route blocked after first user exists (middleware check)

**Default credentials (fallback only):**
- Seeded at DB init if somehow setup is skipped: `admin` / `admin123`
- `isDefaultCredential: true` flag on User model
- On first login with default credentials → force redirect to `/setup/change-credentials`
- After user sets real password → `isDefaultCredential` set to `false`, flag never shown again
- Default user deleted after real admin created (or password changed)

---

## Sync Architecture

### Direction

| Data | Direction | When |
|---|---|---|
| Transactions (new) | local → remote | on reconnect |
| Product catalog | remote → local | on reconnect + periodic |
| Users | remote → local | on reconnect |
| Payment methods | remote → local | on reconnect |
| Discounts | remote → local | on reconnect |
| Customers | bidirectional | on reconnect |
| Receipt config | remote → local | on reconnect |

### Sync trigger

- App start (if online)
- Reconnect detected (ping every 30s)
- Manual "Sync Sekarang" button in app header

### Connectivity check

Ping remote host (`HEAD /api/health`) every 30s. Status stored in Electron main, exposed to renderer via IPC. Header shows sync status indicator.

### Delta sync

All catalog tables include `updatedAt`. Sync stores `lastSyncAt` per table in `sync_meta` SQLite table. Each sync sends `?since=<lastSyncAt>` — server returns only changed records.

First sync (empty `sync_meta`) = full download.

---

## Transaction Queue

Transactions created while offline are written to local SQLite with `syncStatus: PENDING`.

On reconnect flush:
1. Collect all transactions where `syncStatus = PENDING`, ordered by `createdAt`
2. POST each to `POST /api/sync/flush` (batch)
3. Server runs existing atomic checkout logic per transaction
4. Returns `{ synced: string[], failed: { id, reason }[] }`
5. Mark synced → `syncStatus: SYNCED`
6. Mark failed → `syncStatus: FAILED`, store `failReason`
7. Show failed count in UI — dedicated review screen at `/kasir/sync-failures`

### Stock conflict resolution

Server is authoritative. During flush, server checks live stock:
- Sufficient → transaction accepted, stock decremented on remote
- Insufficient → transaction marked FAILED with reason
- After flush → delta sync pulls updated stock back to local SQLite

Local SQLite stock during offline = stale display only. Badge "Stok mungkin tidak akurat" shown when offline.

---

## QRIS Offline

Two QRIS modes:

| Mode | Online | Offline |
|---|---|---|
| Midtrans dynamic | ✅ full flow + polling | ❌ disabled |
| Static QRIS | ✅ | ✅ manual confirm |

Static QRIS image stored in `ReceiptConfig.staticQrisImage` (base64 or URL). Synced to local SQLite.

Offline QRIS flow:
1. Cashier selects QRIS payment
2. App detects offline → shows static QR image
3. Customer scans, pays manually
4. Cashier clicks "Pembayaran Diterima"
5. Transaction queued locally as QRIS payment type
6. Flushed on reconnect (no Midtrans verification, marked as manually confirmed)

---

## Feature Availability

| Feature | Online | Offline |
|---|---|---|
| POS / Kasir | ✅ | ✅ |
| Barcode scan | ✅ | ✅ (local SQLite) |
| Product text search | ✅ | ✅ (local SQLite) |
| Cash checkout | ✅ | ✅ queued |
| QRIS static (manual) | ✅ | ✅ queued |
| QRIS Midtrans dynamic | ✅ | ❌ |
| Dashboard (all pages) | ✅ | ✅ (local SQLite) |
| Product CRUD | ✅ | ✅ (local, synced later) |
| Purchase orders | ✅ | ✅ (local, synced later) |
| Stock opname | ✅ | ✅ (local, synced later) |
| Reports | ✅ | ✅ (local data, may be stale) |
| User management | ✅ | ✅ (local, synced later) |

---

## Breaking Changes from Current Codebase

### 1. Prisma database provider

`prisma/schema.prisma`:
```prisma
datasource db {
  provider = "sqlite"   // was "postgresql"
  url      = env("DATABASE_URL")
}
```

`DATABASE_URL` for desktop = `file:../userData/kasir.db` (set by Electron main at runtime via env injection).

### 2. Raw SQL batch queries

Current codebase uses PostgreSQL-specific `UPDATE ... FROM (VALUES ...)` syntax in:
- `src/app/api/stock-opname/[id]/route.ts` (confirm action)
- Any other `$executeRawUnsafe` calls

Must rewrite using SQLite-compatible syntax:
```sql
-- PostgreSQL (current)
UPDATE "StockOpnameItem" SET "physicalQty" = v.qty
FROM (VALUES ...) AS v(id, qty)
WHERE "StockOpnameItem".id = v.id

-- SQLite replacement
UPDATE "StockOpnameItem" SET "physicalQty" = CASE id
  WHEN ? THEN ? WHEN ? THEN ? ...
END WHERE id IN (...)
```
Or use Prisma `updateMany` with individual updates inside `$transaction([])`.

### 3. New User model field

```prisma
model User {
  // existing fields...
  isDefaultCredential Boolean @default(false)
}
```

### 4. New syncStatus field on Transaction

```prisma
model Transaction {
  // existing fields...
  syncStatus String @default("SYNCED") // PENDING | SYNCED | FAILED
  syncFailReason String?
  localId    String? @unique // client-generated UUID for queue matching
}
```

### 5. New sync_meta table

```prisma
model SyncMeta {
  storeName  String @id
  lastSyncAt DateTime?
}
```

---

## New API Routes (remote server)

### `GET /api/sync/catalog`

Returns all catalog data modified after `since` param.

Query: `?since=2026-05-20T00:00:00Z` (omit for full sync)

Response:
```json
{
  "variants": [...],
  "paymentMethods": [...],
  "discounts": [...],
  "customers": [...],
  "receiptConfig": {...},
  "users": [...],
  "syncedAt": "2026-05-23T10:00:00Z"
}
```

### `POST /api/sync/flush`

Accepts batch of pending transactions from desktop client.

Body: `{ transactions: PendingTransaction[] }`

Each `PendingTransaction` = same shape as existing `POST /api/transactions` body + `localId`.

Response:
```json
{
  "synced": ["local-uuid-1", "local-uuid-2"],
  "failed": [
    { "localId": "local-uuid-3", "reason": "Stok tidak cukup: Beras 5kg" }
  ]
}
```

### `GET /api/health`

Simple ping endpoint for connectivity check.

Response: `{ "ok": true }`

---

## Electron File Structure

```
electron/
  main.ts          ← BrowserWindow, app lifecycle, next start spawn
  sync.ts          ← sync service, connectivity monitor
  preload.ts       ← contextBridge: sync status, manual sync trigger
  updater.ts       ← electron-updater auto-update
electron-builder.yml ← packaging config
src/app/setup/
  page.tsx         ← first-run setup wizard
src/app/kasir/
  sync-failures/
    page.tsx       ← failed transaction review screen
src/middleware.ts  ← add /setup route guard
```

---

## Packaging

```yaml
# electron-builder.yml
appId: com.kasir.app
productName: Kasir
targets:
  - target: nsis      # Windows installer (.exe)
  - target: AppImage  # Linux
publish:
  provider: generic
  url: https://<tailscale-host>/updates/
```

SQLite file location: `app.getPath('userData')/kasir.db`  
Survives: app updates, reinstalls, Windows restarts.  
Only lost: manual AppData deletion or uninstall with "delete user data".

### Auto-update

`electron-updater` checks `https://<tailscale-host>/updates/latest.yml` on app launch. Downloads and installs silently, prompts restart.

Remote server serves update files from a static directory.

---

## Cart Persistence During Sync

Zustand cart state (in-memory) persists naturally during background sync since BrowserWindow never reloads. If app is closed mid-cart, cart is lost (acceptable — same as closing browser tab).

No cart persistence to disk needed.

---

## Development Workflow

- Branch: `electron`
- Tests: skipped during implementation, added in final task
- Two build targets:
  - `npm run dev` → Next.js dev server only (web development, no Electron)
  - `npm run electron:dev` → Electron + Next.js dev server
  - `npm run electron:build` → production .exe / AppImage

---

## Implementation Order

1. Prisma SQLite migration + fix raw SQL queries
2. New DB fields (syncStatus, isDefaultCredential, SyncMeta)
3. First-run setup page + middleware guard
4. Electron scaffold (main, preload, BrowserWindow)
5. Sync service + connectivity monitor
6. New remote API routes (health, sync/catalog, sync/flush)
7. Offline QRIS static mode in QrisModal
8. Transaction queue (syncStatus flow)
9. Sync failures review screen
10. electron-builder packaging + auto-updater
11. Tests (final)
