# Kasir — Project Context for Claude

## What This Is

POS + Inventory Management for a toko kelontong (grocery store). Indonesian UI.

One codebase, two deployment modes:

- **Desktop (Electron)** — SQLite, offline-first, syncs to remote server
- **Server (`IS_PROD_SERVER=true`)** — PostgreSQL, acts as sync target for Electron clients

`main` is the unified branch. Both modes run from the same Next.js app.

Old Firebird schema (migration reference): `source/previous.sql`

---

## Tech Stack

| Layer              | Technology                                        |
| ------------------ | ------------------------------------------------- |
| Framework          | Next.js 15 App Router + TypeScript                |
| ORM                | Prisma 5                                          |
| Database (desktop) | SQLite (`app.getPath('userData')/kasir.db`)       |
| Database (server)  | PostgreSQL 16                                     |
| Auth               | NextAuth.js v5 (JWT strategy)                     |
| Styling            | Tailwind CSS                                      |
| POS state          | Zustand (`src/store/pos.ts`)                      |
| Validation         | Zod (all API route inputs)                        |
| Testing            | Vitest                                            |
| Dev seed           | @faker-js/faker (`fakerID_ID` locale)             |
| Formatting         | Prettier (pre-commit via husky + lint-staged)     |
| Desktop            | Electron 42 + electron-builder + electron-updater |

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

**Raw SQL only for bulk operations.** One file uses `$executeRawUnsafe`: `src/app/api/stock-opname/[id]/route.ts` (`set-all` action). Uses `const isPg = process.env.IS_PROD_SERVER === "true"` to switch between:
- SQLite: `LOWER() LIKE LOWER(?)` + `?` placeholders + subquery
- PostgreSQL: `ILIKE` + `$1,$2` positional params + `UPDATE FROM JOIN` syntax

**No images.** Text-based product display for performance.

---

## Database Schemas

Two schema files:

- `prisma/schema.prisma` — **SQLite** (default, used by Electron + dev). Provider: `sqlite`. No `@db.Decimal`. No enums.
- `prisma/schema.postgresql.prisma` — **PostgreSQL** (server mode). Provider: `postgresql`. All `Decimal` fields have `@db.Decimal(12, 2)`.

`schema.prisma` is the working file. `build:server` script swaps it to the PostgreSQL version before generating the client. Run `schema:restore` or `git checkout prisma/schema.prisma` to revert.

**Never commit `prisma/schema.prisma` in the PostgreSQL state.**

---

## IS_PROD_SERVER

`IS_PROD_SERVER=true` env var signals server (PostgreSQL) mode. Currently affects:

- `src/app/api/stock-opname/[id]/route.ts` — switches raw SQL dialect

When adding new raw SQL that would differ between SQLite and PostgreSQL, check this flag the same way.

---

## RBAC

Two roles: `ADMIN` | `EMPLOYEE`

- `/kasir` — both roles (POS checkout only)
- `/dashboard/*` — ADMIN only
- `/api/transactions` — both roles
- `/api/variants/scan` + `/api/variants/search` — both roles
- Everything else under `/api/*` — ADMIN only

---

## Key Models (18 total)

```
Role, User (isDefaultCredential Boolean)
Supplier, Customer
CategoryOption, UnitOption
Product → ProductVariant (barcode nullable+unique, unit free string, costPrice nullable, isActive boolean default true)
PaymentMethod
Discount (type: PERCENT|FLAT stored as String, scope: TRANSACTION|PRODUCT, productId nullable)
Transaction → TransactionItem
  syncStatus String (PENDING|SYNCED|FAILED|DISMISSED), syncFailReason String?, localId String? @unique
PurchaseOrder (DRAFT→RECEIVED→CANCELLED) → PurchaseOrderItem
PurchaseList → PurchaseListItem
StockOpname (DRAFT→CONFIRMED) → StockOpnameItem
ReceiptConfig (singleton id=1, staticQrisImage String?)
ImportLog
SyncMeta — storeName String @id, lastSyncAt DateTime?
```

`ProductVariant.barcode` is nullable — products without barcode use text search via `/api/variants/search`.

`ProductVariant.isActive` — soft-disable variants without deleting. Inactive variants excluded from POS search/scan and stock opname snapshots.

DB indexes on `Product`: `@@index([name])`, `@@index([category])`. On `ProductVariant`: `@@index([isActive])`, `@@index([isActive, stock])`. Required for 10k+ product performance.

**Schema note:** All enums removed (SQLite has no native enum support). `Decimal` fields have no `@db.Decimal` annotations in `schema.prisma`. The PostgreSQL schema (`schema.postgresql.prisma`) adds them.

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
- `set-all` with `q` param: raw SQL, dialect-switched via `IS_PROD_SERVER`
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
# Via CLI (packaged app)
./Kasir-0.1.0.AppImage --seed        # empty DB only
./Kasir-0.1.0.AppImage --force-seed  # wipe + re-seed

# Via npm (dev/server)
npx prisma db seed
```

Generates: 1 admin + 5 employees (password: `password123`), 20 sembako products, 10 suppliers, 30 customers, 5 payment methods, 3 discounts, 200 transactions (last 30 days), 20 purchase orders.

Seed endpoint: `POST /api/seed` (public, guards against re-seed unless `{ force: true }`).

---

## File Naming & Structure

```
src/app/(auth)/login/              ← login page
src/app/setup/                     ← first-run setup wizard
src/app/kasir/                     ← POS (ADMIN + EMPLOYEE)
src/app/kasir/sync-failures/       ← failed sync review
src/app/dashboard/                 ← all admin pages
src/app/dashboard/settings/remote/ ← remote URL config
src/app/api/                       ← route handlers (thin)
src/app/api/health/                ← ping endpoint
src/app/api/seed/                  ← seed endpoint (POST, public)
src/app/api/sync/                  ← sync routes: catalog, flush, mark, meta, apply, pending
src/components/pos/                ← POS-specific components
src/components/receipt/            ← print receipt
src/components/ui/                 ← shared: Button, Input, Modal, Table, Badge, Toast
src/hooks/                         ← useOnlineStatus, useSyncStatus
src/lib/                           ← business logic + auth + prisma + validations
src/store/pos.ts                   ← Zustand cart store
src/types/electron.d.ts            ← Window.electronAPI type declaration
src/middleware.ts                  ← RBAC Edge middleware
electron/
  main.ts                          ← BrowserWindow, next start spawn, IPC handlers
  preload.ts                       ← contextBridge → electronAPI
  sync.ts                          ← connectivity monitor, flush, catalog pull
  updater.ts                       ← auto-update
electron-builder.yml               ← packaging config (.AppImage + NSIS .exe)
prisma/schema.prisma               ← SQLite schema (default)
prisma/schema.postgresql.prisma    ← PostgreSQL schema (server mode)
scripts/use-pg-schema.sh           ← swap schema.prisma → PostgreSQL
scripts/restore-sqlite-schema.sh   ← restore schema.prisma → SQLite
```

---

## Dev Progression

Status legend: `[ ]` pending · `[~]` in progress · `[x]` done

### Unified `main` branch ✅

- [x] Core: scaffold, schema, auth, RBAC, login/layout
- [x] Business logic: discount calc, products API, scan/search, cart, checkout, receipt, POS page
- [x] Dashboard: products UI, seed, supplier/customer, purchase orders, receipt config, discounts, stock opname, reports, user management
- [x] Electron: main process, preload, IPC, sync service, sync API routes, transaction queue, QRIS offline, sync failures, remote URL settings, packaging, auto-updater
- [x] Server mode: `IS_PROD_SERVER=true`, `prisma/schema.postgresql.prisma`, `build:server` script
- [x] Tests (33 passing)
- [ ] GDB Import (stub only — Task 21)

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
tests/lib/stock-opname-sqlite.test.ts
tests/store/pos.test.ts
tests/api/sync-mark.test.ts
tests/api/setup-guard.test.ts
tests/sync/connectivity.test.ts
```

Run all tests: `npx vitest run`

---

## Do Not

- Add `console.log` or debug code to committed files
- Write N individual Prisma updates in a loop — use `$transaction([...items.map(update)])`
- Put business logic in route handlers — put it in `src/lib/`
- Skip Zod validation on any API route input
- Add product image fields — design decision: text-only
- Add `Co-Authored-By: Claude` to commits
- Write unit tests during implementation tasks — tests go in final consolidated test tasks only
- Skip Prettier — pre-commit hook enforces it; run `npx prettier --write "src/**/*.{ts,tsx}"` to format manually
- Use `FROM (VALUES ...)` raw SQL — SQLite incompatible; use `$transaction([...items.map(update)])`
- Use bare `ILIKE` or bare `LOWER() LIKE LOWER(?)` without the `isPg` guard — always branch on `IS_PROD_SERVER`
- Use `@db.Decimal` annotations in `prisma/schema.prisma` — SQLite incompatible; they belong only in `prisma/schema.postgresql.prisma`
- Re-check auth in route handlers — RBAC is at Edge in `middleware.ts`
- Commit `prisma/schema.prisma` while it contains `provider = "postgresql"` — always restore before committing

---

## Key Constraints

- `DATABASE_URL` injected by Electron main process at runtime (`file:<userData>/kasir.db`). Not set in `.env` for Electron.
- `/api/sync/*`, `/api/health`, `/api/setup`, `/api/seed`, `/setup` are in `PUBLIC_PATHS` — no auth required
- Sync service (`electron/sync.ts`) calls local routes at `http://127.0.0.1:3000`
- `window.electronAPI` only available inside Electron — always guard with `typeof window !== "undefined" && window.electronAPI`
- `SyncStatus` is a global ambient type in `src/types/electron.d.ts` — no import needed in React components
- Electron loads `http://127.0.0.1:3000` (not `localhost`) — `host-resolver-rules` maps localhost → 127.0.0.1 for auth redirects
