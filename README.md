# Kasir

POS + Inventory Management untuk toko kelontong. UI bahasa Indonesia.

Satu codebase, dua mode deployment:

| Mode | Database | Cara jalankan |
| ---- | -------- | ------------- |
| **Desktop (Electron)** | SQLite (lokal, offline-first) | `npm run electron:build` |
| **Server (sync target)** | PostgreSQL | `IS_PROD_SERVER=true npm run build:server` |

Electron desktop melakukan sync ke server PostgreSQL saat online.

---

## Fitur

- **Kasir / POS** — barcode scan, text search, cart, checkout, QRIS (Midtrans + static offline)
- **Produk** — CRUD, kategori, satuan, import CSV, soft-disable varian
- **Stok** — stock opname dengan pagination server-side, bulk update, paste-match
- **Pembelian** — purchase order DRAFT → RECEIVED → CANCELLED, otomatis tambah stok
- **Laporan** — transaksi, revenue, grafik harian
- **Struk** — template 58mm/80mm, auto-print setelah checkout
- **Manajemen** — user, supplier, customer, diskon, metode pembayaran, konfigurasi struk
- **Offline** — semua fitur jalan tanpa internet, sync ke server saat online
- **Setup wizard** — buat akun admin pertama kali (first-run)

---

## Tech Stack

| Layer              | Teknologi                                                 |
| ------------------ | --------------------------------------------------------- |
| Framework          | Next.js 15 App Router + TypeScript                        |
| ORM                | Prisma 5                                                  |
| Database (desktop) | SQLite (`userData/kasir.db`)                              |
| Database (server)  | PostgreSQL 16                                             |
| Auth               | NextAuth.js v5 (JWT)                                      |
| Styling            | Tailwind CSS                                              |
| State POS          | Zustand                                                   |
| Validasi           | Zod                                                       |
| Test               | Vitest                                                    |
| Desktop            | Electron 42 + electron-builder                            |
| Sync               | Background service (ping 30s, flush queue, delta catalog) |

---

## Setup Desktop (Electron)

```bash
npm install

# Dev — Next.js + Electron bersamaan
npm run electron:dev
```

Pertama kali buka: wizard setup untuk buat akun admin.

SQLite tersimpan di `userData/kasir.db` (Windows: `%APPDATA%\Kasir\`, Linux: `~/.config/kasir/`). Data tetap ada setelah update/reinstall.

### Seed data contoh

```bash
# Pertama kali (DB kosong)
./Kasir-0.1.0.AppImage --seed

# Timpa data yang sudah ada
./Kasir-0.1.0.AppImage --force-seed
```

Login: `admin@kasir.com` / `password123`

### Build distribusi

```bash
npm run electron:build
# Output: dist/Kasir-0.1.0.AppImage (Linux) atau dist/Kasir Setup 0.1.0.exe (Windows)
```

### Konfigurasi sync

Buka `/dashboard/settings/remote` → masukkan URL server (contoh: `https://kasir.example.com`).

---

## Setup Server (PostgreSQL)

```bash
npm install

# Buat .env
cp .env.example .env
# Set IS_PROD_SERVER=true dan DATABASE_URL ke PostgreSQL

# Build (swap schema → generate → next build)
npm run build:server

# Migrate DB (pertama kali deploy)
npx prisma migrate deploy --schema=prisma/schema.postgresql.prisma

# Start
IS_PROD_SERVER=true npm start
```

### Restore schema SQLite (setelah build:server)

```bash
npm run schema:restore
```

---

## Sync Architecture

```
Electron desktop
├── spawns: node standalone/server.js (127.0.0.1:3000)
├── database: SQLite via Prisma
├── pings: <remoteUrl>/api/health setiap 30 detik
└── BrowserWindow loads http://127.0.0.1:3000

Saat online:
  PENDING transactions → POST /api/sync/flush → remote PostgreSQL server
  Remote catalog → GET /api/sync/catalog → POST /api/sync/apply → local SQLite

Saat offline:
  POS tetap jalan, transaksi disimpan syncStatus=PENDING
  QRIS: pakai static QR image, konfirmasi manual
  Stok: tampil data lokal (ada badge peringatan)
```

Transaksi gagal flush (misal stok kurang di server) → `syncStatus=FAILED` → review di `/kasir/sync-failures`.

---

## RBAC

| Route                                        | ADMIN | EMPLOYEE |
| -------------------------------------------- | ----- | -------- |
| `/kasir`                                     | ✅    | ✅       |
| `/api/transactions` (POST)                   | ✅    | ✅       |
| `/api/variants/scan`, `/api/variants/search` | ✅    | ✅       |
| `/dashboard/*`                               | ✅    | ❌       |
| `/api/*` (lainnya)                           | ✅    | ❌       |

RBAC dihandle di `middleware.ts` (Edge). Handler tidak re-check.

---

## Testing

```bash
npx vitest run
```

33 tests — discount logic, transaction totals, stock opname, POS store, sync logic, setup guard.

---

## Scripts

```bash
npm run dev                # Next.js dev server (SQLite)
npm run build              # Next.js production build (SQLite)
npm run build:server       # Production build untuk server PostgreSQL
npm run schema:restore     # Restore schema.prisma ke SQLite setelah build:server
npm run electron:dev       # Electron + Next.js dev (concurrently)
npm run electron:build     # Full distributable build (.AppImage / .exe)
npm run electron:pack      # Build tanpa installer (untuk testing)
npx prisma db seed         # Seed data dev (SQLite)
npx vitest run             # Run all tests
npx prettier --write "src/**/*.{ts,tsx}"  # Format manual
```
