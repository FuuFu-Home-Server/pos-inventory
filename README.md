# Kasir

POS + Inventory Management untuk toko kelontong. UI bahasa Indonesia.

Tersedia sebagai **web app** (browser) dan **desktop app** (Electron, branch `electron`).

---

## Fitur

- **Kasir / POS** — barcode scan, text search, cart, kasir, QRIS (Midtrans + static offline)
- **Produk** — CRUD, kategori, satuan, import CSV, soft-disable varian
- **Stok** — stock opname dengan pagination server-side, bulk update, paste-match
- **Pembelian** — purchase order DRAFT → RECEIVED → CANCELLED, otomatis tambah stok
- **Laporan** — transaksi, revenue, grafik harian
- **Struk** — template 58mm/80mm, auto-print setelah checkout
- **Manajemen** — user, supplier, customer, diskon, metode pembayaran, konfigurasi struk
- **Offline (Electron)** — semua fitur jalan tanpa internet, sync ke server saat online

---

## Tech Stack

| Layer              | Teknologi                                                 |
| ------------------ | --------------------------------------------------------- |
| Framework          | Next.js 15 App Router + TypeScript                        |
| ORM                | Prisma 5                                                  |
| Database (web)     | PostgreSQL 16                                             |
| Database (desktop) | SQLite (via Prisma, `userData/kasir.db`)                  |
| Auth               | NextAuth.js v5 (JWT)                                      |
| Styling            | Tailwind CSS                                              |
| State POS          | Zustand                                                   |
| Validasi           | Zod                                                       |
| Test               | Vitest                                                    |
| Desktop            | Electron 31 + electron-builder                            |
| Sync               | Background service (ping 30s, flush queue, delta catalog) |

---

## Struktur Proyek

```
src/
  app/
    (auth)/login/          ← halaman login
    kasir/                 ← POS (ADMIN + EMPLOYEE)
    kasir/sync-failures/   ← review transaksi gagal sync (Electron)
    dashboard/             ← semua halaman admin
    dashboard/settings/remote/ ← konfigurasi URL server remote (Electron)
    api/                   ← route handlers (thin)
    setup/                 ← wizard pertama kali (Electron)
  components/
    pos/                   ← komponen POS
    receipt/               ← template struk cetak
    ui/                    ← Button, Input, Modal, Table, Badge, Toast
  hooks/
    useOnlineStatus.ts     ← status online/offline dari Electron IPC
    useSyncStatus.ts       ← status sync (pending, failed, lastSyncAt)
  lib/                     ← business logic, auth, prisma, validasi
  store/pos.ts             ← Zustand cart store
  middleware.ts            ← RBAC di Edge
  types/electron.d.ts      ← Window.electronAPI type declaration
electron/
  main.ts                  ← BrowserWindow, spawn next start, IPC handlers
  preload.ts               ← contextBridge → electronAPI
  sync.ts                  ← connectivity monitor, flush queue, pull catalog
  updater.ts               ← auto-update via electron-updater
  tsconfig.json
electron-builder.yml       ← packaging config (.exe NSIS + AppImage)
prisma/schema.prisma
```

---

## Setup Web (Development)

```bash
# Install dependencies
npm install

# Buat file .env
cp .env.example .env
# Edit DATABASE_URL ke PostgreSQL

# Migrate + seed
npx prisma db push
npx prisma db seed

# Dev server
npm run dev
```

Login default seed: `admin@example.com` / `password123`

---

## Setup Desktop (Electron)

```bash
# Install dependencies (sama dengan web)
npm install

# Dev — Next.js + Electron bersamaan
npm run electron:dev
```

Pertama kali buka: wizard setup untuk buat akun admin.

SQLite tersimpan di `userData/kasir.db` (Windows: `%APPDATA%/Kasir/`, Linux: `~/.config/Kasir/`). Data tetap ada setelah update/reinstall.

### Build distribusi

```bash
# Production build
npm run electron:build
# Output: dist/Kasir Setup 1.0.0.exe (Windows) atau dist/Kasir-1.0.0.AppImage (Linux)
```

Ganti `build/icon.png` dan `build/icon.ico` dengan ikon nyata sebelum distribusi.

### Konfigurasi sync

Buka `/dashboard/settings/remote` di dalam app → masukkan URL server Tailscale (contoh: `https://kasir.your-tailnet.ts.net`).

---

## Sync Architecture (Electron)

```
Electron main process
├── spawns: node .next/standalone/server.js (localhost:3000)
├── manages: SQLite via Prisma
├── pings: <remoteUrl>/api/health setiap 30 detik
└── BrowserWindow selalu load http://localhost:3000

Saat online:
  PENDING transactions → POST /api/sync/flush → remote PostgreSQL
  Remote catalog → GET /api/sync/catalog → POST /api/sync/apply → local SQLite

Saat offline:
  POS tetap jalan, transaksi disimpan syncStatus=PENDING
  QRIS: pakai static QR image, konfirmasi manual
  Stok: tampil data lokal (mungkin stale, ada badge peringatan)
```

Transaksi gagal flush (stok kurang di server) → `syncStatus=FAILED` → review di `/kasir/sync-failures`.

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
npm run dev              # Next.js dev server
npm run build            # Next.js production build
npm run electron:dev     # Electron + Next.js dev (concurrently)
npm run electron:build   # Full distributable build
npm run electron:pack    # Build tanpa installer (untuk testing)
npx prisma db seed       # Seed data dev
npx vitest run           # Run all tests
npx prettier --write "src/**/*.{ts,tsx}"  # Format manual
```

---

## Branches

| Branch     | Deskripsi                              |
| ---------- | -------------------------------------- |
| `main`     | Web app — Next.js + PostgreSQL         |
| `electron` | Desktop app — Electron + SQLite + sync |
