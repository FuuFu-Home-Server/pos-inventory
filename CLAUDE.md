# Kasir — Project Context for Claude

## What This Is

POS + Inventory Management for a toko kelontong (grocery store). Indonesian UI.

Two branches:

- `main` — web app (Next.js + PostgreSQL), deployed on VPS/cloud
- `electron` — desktop app (Electron + SQLite + background sync to remote PostgreSQL)

Specs:

- Web: `docs/superpowers/specs/2026-05-21-pos-inventory-design.md`
- Desktop: `docs/superpowers/specs/2026-05-23-electron-offline-desktop-design.md`

Plans:

- Web: `docs/superpowers/plans/2026-05-21-pos-inventory-plan.md`
- Desktop: `docs/superpowers/plans/2026-05-23-electron-offline-desktop-plan.md`

Old Firebird schema (migration reference): `source/previous.sql`

---

## Tech Stack

| Layer              | Technology                                        |
| ------------------ | ------------------------------------------------- |
| Framework          | Next.js 15 App Router + TypeScript                |
| ORM                | Prisma 5                                          |
| Database (web)     | PostgreSQL 16                                     |
| Database (desktop) | SQLite (`app.getPath('userData')/kasir.db`)       |
| Auth               | NextAuth.js v5 (JWT strategy)                     |
| Styling            | Tailwind CSS                                      |
| POS state          | Zustand (`src/store/pos.ts`)                      |
| Validation         | Zod (all API route inputs)                        |
| Testing            | Vitest                                            |
| Dev seed           | @faker-js/faker (`fakerID_ID` locale)             |
| Formatting         | Prettier (pre-commit via husky + lint-staged)     |
| Desktop            | Electron 31 + electron-builder + electron-updater |

---

## Architecture Rules

**API routes are thin.** Business logic lives in `src/lib/` — not in route handlers.

```
src/lib/discount-calc.ts         ← pure discount math
src/lib/transaction-service.ts   ← build totals, validate
src/lib/purchase-order-service.ts
src/lib/stock-opname-service.ts
src/lib/import-mapper.ts         ← GDB field mappings (pure transforms)
```

**RBAC at Edge.** `middleware.ts` checks role before any handler runs. Never re-check in handlers.

**Atomic operations via `prisma.$transaction()`.** Three operations require this:

1. Checkout → INSERT transaction + items + DECREMENT stock
2. PO receive → RECEIVED status + INCREMENT stock
3. Opname confirm → CONFIRMED status + SET stock = physicalQty

**Raw SQL only for bulk operations.** On the `main` branch (PostgreSQL): N-row batch updates use `prisma.$executeRawUnsafe` with `UPDATE ... FROM (VALUES ...)`. On the `electron` branch (SQLite): these were rewritten to `prisma.$transaction([...items.map(update)])` — SQLite does not support `FROM (VALUES ...)` syntax. Case-insensitive search uses `LOWER() LIKE LOWER(?)` instead of `ILIKE`.

**No images.** Text-based product display for performance.

---

## RBAC

Two roles: `ADMIN` | `EMPLOYEE`

- `/kasir` — both roles (POS checkout only)
- `/dashboard/*` — ADMIN only
- `/api/transactions` — both roles
- `/api/variants/scan` + `/api/variants/search` — both roles
- Everything else under `/api/*` — ADMIN only

---

## Key Models (16 total)

```
Role, User (isDefaultCredential Boolean — electron branch only)
Supplier, Customer
Product → ProductVariant (barcode nullable+unique, unit free string, costPrice nullable, isActive boolean default true)
PaymentMethod
Discount (type: PERCENT|FLAT stored as String in electron branch, scope: TRANSACTION|PRODUCT, productId nullable)
Transaction → TransactionItem
  electron branch adds: syncStatus String (PENDING|SYNCED|FAILED|DISMISSED), syncFailReason String?, localId String? @unique
PurchaseOrder (DRAFT→RECEIVED→CANCELLED) → PurchaseOrderItem
StockOpname (DRAFT→CONFIRMED) → StockOpnameItem
ReceiptConfig (singleton id=1) — electron branch adds: staticQrisImage String?
ImportLog
SyncMeta (electron branch only) — storeName String @id, lastSyncAt DateTime?
```

`ProductVariant.barcode` is nullable — products without barcode use text search via `/api/variants/search`.

`ProductVariant.costPrice` is nullable — populated from old `BARANG.HRG_BELI` during GDB migration.

`ProductVariant.isActive` — soft-disable variants without deleting (protects FK integrity with transaction history). Inactive variants are excluded from POS search/scan and stock opname snapshots.

DB indexes on `Product`: `@@index([name])`, `@@index([category])`. On `ProductVariant`: `@@index([isActive])`, `@@index([isActive, stock])`. Required for 10k+ product performance.

**Electron branch schema note:** All enums removed (SQLite has no native enum support). `Decimal` fields have no `@db.Decimal` annotations. Prisma handles enum-as-string transparently.

---

## POS Barcode Flow

```
global keydown → buffer chars → 50ms debounce
→ Enter/Tab fires if buffer.length >= 4
→ ignore if event.target is INPUT/TEXTAREA/SELECT
→ POST /api/variants/scan { barcode }
→ found: add to cart (auto-increment qty if exists)
→ not found: toast error
```

Text search fallback: `GET /api/variants/search?q=...` with 300ms debounce. Returns max 30 results. Filters `isActive: true`.  
Multi-variant result → `VariantPickerModal`.

POS search dropdown uses `createPortal` to `document.body` (fixed position) to escape modal `overflow` clipping.

---

## Receipt Printing

- Component: `src/components/receipt/ReceiptTemplate.tsx` with `id="receipt-print"`
- CSS `@media print` in `src/app/globals.css` — only `#receipt-print` visible
- Width classes: `receipt-58mm` (10px font) | `receipt-80mm` (12px font)
- Auto-trigger: fetch `/api/receipt-config` after checkout → `setTimeout(window.print, 300)`
- Config stored in `ReceiptConfig` table (singleton id=1)

---

## CSV Product Import

Route `POST /api/products/import` accepts `{ headers, rows, mapping }` JSON. Upserts products by name+category, variants by barcode or productId+variantName. Returns `{ created, updated, errors }`.

UI at `/dashboard/produk` — file picker → client-side CSV parse → column mapping modal → POST. `autoMap()` uses alias matching for column detection on unstructured CSVs.

---

## Stock Opname — Architecture

Stock opname with 10k+ variants uses server-side pagination. Client never loads all rows.

- `GET /api/stock-opname/[id]?page=&limit=100&q=` — paginated, searched server-side
- `PATCH` actions: `batch-update`, `set-all`, `match-paste`, `confirm` — all server-side bulk SQL
- `set-all` with `q` param runs ILIKE filter on server, no client state needed
- `match-paste` matches all opname items on server, returns `{ matched, unmatched }`
- Hook: `useStockOpname` — `meta` (not `detail`), `items` (current page), `localQtys` tracks unsaved edits across pages
- `changedCount = Object.keys(localQtys).length` — all tracked changes, not just current page

---

## GDB Import (Low Priority — Stub)

Route `/api/import` returns 501. Page `/dashboard/import` shows placeholder UI.

Field mapping reference in `src/lib/import-mapper.ts`:

- `BARANG` + `ISIAN2` → `Product` + `ProductVariant`
- `BARANG.KODE_LAIN` → `barcode` (null if value is `'-'`)
- `BARANG.HRG_BELI` → `costPrice`
- `BARANG.BATAS1` → `lowStockThreshold`
- `ISIAN2` rows per `IDBARANG` → multiple `ProductVariant` records
- `SUPLIER` → `Supplier`, `CUSTOMER` → `Customer`
- `ASPASS.FLEVEL` → role (`ADMIN` if contains "ADMIN"/"OWNER", else `EMPLOYEE`)
- `ASPASS.FPASS` → must bcrypt re-hash on import

---

## Dev Seed

```bash
npx prisma db seed
```

Generates: 1 admin + 5 employees (password: `password123`), 20 sembako products, 10 suppliers, 30 customers, 5 payment methods, 3 discounts, 200 transactions (last 30 days), 20 purchase orders.

---

## File Naming & Structure

```
src/app/(auth)/login/              ← login page
src/app/setup/                     ← first-run setup wizard (electron branch)
src/app/kasir/                     ← POS (ADMIN + EMPLOYEE)
src/app/kasir/sync-failures/       ← failed sync review (electron branch)
src/app/dashboard/                 ← all admin pages
src/app/dashboard/settings/remote/ ← remote URL config (electron branch)
src/app/api/                       ← route handlers (thin)
src/app/api/health/                ← ping endpoint (electron branch)
src/app/api/sync/                  ← sync routes: catalog, flush, mark, meta, apply, pending (electron branch)
src/components/pos/                ← POS-specific components
src/components/receipt/            ← print receipt
src/components/ui/                 ← shared: Button, Input, Modal, Table, Badge, Toast
src/hooks/                         ← useOnlineStatus, useSyncStatus (electron branch)
src/lib/                           ← business logic + auth + prisma + validations
src/store/pos.ts                   ← Zustand cart store
src/types/electron.d.ts            ← Window.electronAPI type (electron branch)
src/middleware.ts                  ← RBAC Edge middleware
electron/                          ← Electron main process files (electron branch)
  main.ts                          ← BrowserWindow, next start spawn, IPC
  preload.ts                       ← contextBridge → electronAPI
  sync.ts                          ← connectivity monitor, flush, catalog pull
  updater.ts                       ← auto-update
electron-builder.yml               ← packaging config (electron branch)
```

---

## Dev Progression

Status legend: `[ ]` pending · `[~]` in progress · `[x]` done

### Branch: `main` (web app)

**Phase 1 — Core Foundation** ✅

- [x] Task 1–5: Scaffold, schema, auth, RBAC, login/layout

**Phase 2 — Business Logic + APIs** ✅

- [x] Task 6–13: Format utils, discount calc, products API, scan/search, cart store, checkout API, receipt, POS page

**Phase 3 — Admin Dashboard** ✅

- [x] Task 14–20: Products UI, seed, supplier/customer, purchase orders, receipt config, discounts, stock opname, reports, user management

**Phase 4 — GDB Import + Tests**

- [ ] Task 21: GDB Import Stub + Field Mapping + Run All Tests

### Branch: `electron` (desktop app) ✅

- [x] Task 1: Create electron branch
- [x] Task 2: Install Electron dependencies
- [x] Task 3: Switch Prisma to SQLite + update schema
- [x] Task 4: Fix raw SQL for SQLite (4 queries rewritten)
- [x] Task 5: First-run setup flow (`/setup`, `/api/setup`, middleware, login redirect)
- [x] Task 6: Electron main process (main.ts, preload.ts, electron.d.ts)
- [x] Task 7: Sync service (sync.ts, useOnlineStatus, useSyncStatus)
- [x] Task 8: Remote sync API routes (health, catalog, flush, mark, meta, apply, pending)
- [x] Task 9: Transaction queue (localId, syncStatus, offline UI badges)
- [x] Task 10: QRIS offline static mode
- [x] Task 11: Sync failures review screen
- [x] Task 12: Remote URL settings page
- [x] Task 13: Packaging (electron-builder.yml, updater, standalone next output)
- [x] Task 14: Tests (33 passing)

---

## Testing

**No per-task TDD.** Tests written in consolidated final tasks only.

Test files:

```
tests/lib/rate-limit.test.ts
tests/lib/discount.test.ts
tests/lib/transaction.test.ts
tests/lib/purchase-order.test.ts
tests/lib/stock-opname.test.ts
tests/lib/stock-opname-sqlite.test.ts  ← electron branch
tests/store/pos.test.ts
tests/api/sync-mark.test.ts            ← electron branch
tests/api/setup-guard.test.ts          ← electron branch
tests/sync/connectivity.test.ts        ← electron branch
```

Run all tests: `npx vitest run`

---

## Do Not

- Add `console.log` or debug code to committed files
- Write N individual Prisma updates in a loop — on `main` use `$executeRawUnsafe` with `VALUES` batch; on `electron` use `$transaction([...items.map(update)])`
- Put business logic in route handlers — put it in `src/lib/`
- Skip Zod validation on any API route input
- Add product image fields — design decision: text-only
- Add `Co-Authored-By: Claude` to commits
- Write unit tests during implementation tasks — tests go in final consolidated test tasks only
- Skip Prettier — pre-commit hook enforces it; run `npx prettier --write "src/**/*.{ts,tsx}"` to format manually
- Use `FROM (VALUES ...)` raw SQL on `electron` branch — SQLite incompatible
- Use `ILIKE` on `electron` branch — use `LOWER() LIKE LOWER(?)` instead
- Use `@db.Decimal` annotations on `electron` branch — SQLite incompatible
- Re-check auth in route handlers — RBAC is at Edge in `middleware.ts`

## Electron Branch — Key Constraints

- `DATABASE_URL` is injected by Electron main process at runtime (`file:<userData>/kasir.db`)
- `/api/sync/*` routes are in `PUBLIC_PATHS` (no auth) — called by local sync service without session
- `/api/health`, `/api/setup`, `/setup` also in `PUBLIC_PATHS`
- Sync service (`electron/sync.ts`) calls local routes at `http://localhost:3000` — use `/api/sync/pending` not `/api/transactions?syncStatus=PENDING`
- `window.electronAPI` is only available inside Electron — always guard with `typeof window !== "undefined" && window.electronAPI`
- `SyncStatus` is a global ambient type declared in `src/types/electron.d.ts` — no import needed in React components
