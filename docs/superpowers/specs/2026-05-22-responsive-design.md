# Responsive Design — Kasir POS

**Date:** 2026-05-22  
**Status:** Approved

---

## Goal

Make all pages usable across small laptop, tablet, and mobile phone. Priority order: small laptop (1024–1280px) → tablet (768–1024px) → mobile (<768px).

---

## Breakpoint System

| Range       | Label | Sidebar                                  | POS Layout                               |
| ----------- | ----- | ---------------------------------------- | ---------------------------------------- |
| ≥1280px     | `xl`  | Full `w-56`                              | Side-by-side (unchanged)                 |
| 1024–1280px | `lg`  | Icon rail `w-[68px]`, icon + short label | Side-by-side, payment panel auto-shrinks |
| 768–1024px  | `md`  | Hamburger → overlay drawer               | 60/40 flex split                         |
| <768px      | `sm`  | Hamburger → overlay drawer               | Tabs: Keranjang / Bayar                  |

---

## Sidebar

### ≥1280px (current)

No changes. Full sidebar `w-56` always visible.

### 1024–1280px — Icon Rail

- Sidebar renders as `w-[68px]` collapsed rail.
- Each nav item: icon (15px) centered + 9px label below, stacked vertically, 60px wide pill.
- Group labels (`KATALOG`, `GUDANG`, etc.) hidden in rail mode.
- Logo area: just the indigo square icon, no text.
- User area: avatar only, no name/role text.
- No toggle needed — rail is always visible at this breakpoint.

### <1024px — Hamburger + Overlay Drawer

- Sidebar hidden by default (`translate-x-[-100%]`).
- Hamburger button (`Menu` icon) appears in dashboard header, top-left.
- Click opens full sidebar (`w-56`) sliding in from left with backdrop overlay.
- Clicking backdrop or any nav link closes drawer.
- State: `sidebarOpen: boolean` lifted to `DashboardLayout` — passed as props to `Sidebar` and header.

---

## Dashboard Layout (`layout.tsx` + new `DashboardShell.tsx`)

- `layout.tsx` stays server component (must call `auth()`).
- Extracts a new `"use client"` component: `src/components/dashboard/DashboardShell.tsx`.
- `DashboardShell` owns `sidebarOpen: boolean` state, renders sidebar + mobile header + `{children}`.
- Mobile header (`<lg`): hamburger button (left) + Kasir logo text (center). Hidden at `≥lg`.
- At `≥lg`: no mobile header bar rendered, sidebar always visible (rail or full).
- `layout.tsx` passes `userName` and `userRole` from session to `DashboardShell`.

---

## POS Page (`/kasir`)

### ≥768px (tablet + small laptop + desktop)

- Layout stays `flex-row` (side-by-side).
- Payment panel: `w-[368px]` at `≥xl`, `w-[280px]` at `md`–`lg` (shrinks but stays visible).
- Header keyboard shortcut hints: `hidden md:flex` (already done).
- Hamburger not applicable — POS has its own header with Dashboard link.

### <768px — Tabs

- Layout switches to `flex-col` with two tabs at top: **Keranjang** | **Bayar**.
- Tab state: `activeTab: 'cart' | 'payment'`, default `'cart'`.
- Cart panel tab: shows `ProductSearch` + `CartPanel`. Bottom of cart panel shows sticky total bar with **"Bayar →"** button that sets `activeTab = 'payment'`.
- Payment tab: shows full `PaymentPanel`. Back button returns to cart tab.
- Both tabs take full viewport height minus header.

---

## Dashboard Pages

### Stat Cards (home + laporan)

- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- Currently hardcoded `grid-cols-4` — update to responsive.

### Tables (all dashboard list pages)

- Wrap every `<table>` in `<div className="overflow-x-auto">`.
- Minimum column widths via `min-w-[Xpx]` on `<table>` to prevent layout collapse.

### Page padding

- Pages currently use `p-6` or `p-8` fixed.
- Change to `p-4 md:p-6 lg:p-8`.

### Modals

- `Modal.tsx` currently fixed `max-w-lg`.
- Add `w-full mx-4 sm:mx-auto` so modals don't bleed off screen edges on mobile.

---

## Files Changed

| File                                             | Change                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------ |
| `src/components/dashboard/Sidebar.tsx`           | Icon rail at `lg`, hamburger overlay mode at `<lg`                       |
| `src/app/dashboard/layout.tsx`                   | Pass `userName`/`userRole` to new `DashboardShell`                       |
| `src/components/dashboard/DashboardShell.tsx`    | New `"use client"` wrapper: `sidebarOpen` state, mobile header, backdrop |
| `src/app/kasir/page.tsx`                         | Tab state + layout switch at `<768px`, payment panel width responsive    |
| `src/components/pos/CartPanel.tsx`               | Sticky total bar + "Bayar →" button for mobile tab                       |
| `src/components/pos/PaymentPanel.tsx`            | Back-to-cart button on mobile tab                                        |
| `src/app/dashboard/page.tsx`                     | Responsive stat card grid                                                |
| `src/app/dashboard/laporan/page.tsx`             | Responsive stat card grid                                                |
| `src/app/dashboard/**/page.tsx` (all list pages) | `overflow-x-auto` on tables, responsive padding                          |
| `src/components/ui/Modal.tsx`                    | `w-full mx-4 sm:mx-auto`                                                 |

---

## Out of Scope

- Bottom nav bar on mobile (rejected in design).
- Per-page card view replacing tables on mobile (overflow-x-auto is sufficient).
- POS barcode keyboard shortcuts on mobile (touch-only use case, shortcuts stay hidden).
