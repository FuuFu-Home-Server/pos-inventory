# Responsive Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all pages (dashboard + POS) usable across small laptop (1024–1280px), tablet (768–1024px), and mobile (<768px).

**Architecture:** Sidebar becomes a CSS-driven responsive component — icon rail at `lg`, overlay drawer at `<lg` (controlled by `sidebarOpen` state in a new `DashboardShell` client wrapper). POS uses Tailwind responsive classes for payment panel width at tablet, and JS tab state for mobile. `layout.tsx` stays server-only.

**Tech Stack:** Next.js 15, Tailwind CSS, Zustand, `cn()` from `@/lib/utils`

---

## File Map

| File                                          | Action | Responsibility                                                         |
| --------------------------------------------- | ------ | ---------------------------------------------------------------------- |
| `src/components/ui/Table.tsx`                 | Modify | Add `min-w-[600px]` so tables scroll instead of collapse               |
| `src/components/dashboard/Sidebar.tsx`        | Modify | Icon rail at `lg`, overlay drawer at `<lg`, new `open`/`onClose` props |
| `src/components/dashboard/DashboardShell.tsx` | Create | `"use client"` wrapper owning `sidebarOpen` state + mobile header      |
| `src/app/dashboard/layout.tsx`                | Modify | Delegate rendering to `DashboardShell`, stay server component          |
| `src/app/kasir/page.tsx`                      | Modify | Tab state for mobile, payment panel responsive width                   |
| `src/components/pos/CartPanel.tsx`            | Modify | Accept `onGoToPayment` prop, render mobile sticky total bar            |
| `src/components/pos/PaymentPanel.tsx`         | Modify | Accept `onBack` prop, render mobile back button                        |
| `src/app/dashboard/page.tsx`                  | Modify | Responsive padding                                                     |
| `src/app/dashboard/transaksi/page.tsx`        | Modify | Responsive padding                                                     |
| `src/app/dashboard/produk/page.tsx`           | Modify | Responsive padding                                                     |
| `src/app/dashboard/kategori/page.tsx`         | Modify | Responsive padding                                                     |
| `src/app/dashboard/satuan/page.tsx`           | Modify | Responsive padding                                                     |
| `src/app/dashboard/supplier/page.tsx`         | Modify | Responsive padding                                                     |
| `src/app/dashboard/customer/page.tsx`         | Modify | Responsive padding                                                     |
| `src/app/dashboard/purchase-order/page.tsx`   | Modify | Responsive padding                                                     |
| `src/app/dashboard/daftar-belanja/page.tsx`   | Modify | Responsive padding                                                     |
| `src/app/dashboard/stock-opname/page.tsx`     | Modify | Responsive padding                                                     |
| `src/app/dashboard/laporan/page.tsx`          | Modify | Responsive padding                                                     |
| `src/app/dashboard/diskon/page.tsx`           | Modify | Responsive padding                                                     |
| `src/app/dashboard/pengguna/page.tsx`         | Modify | Responsive padding                                                     |
| `src/app/dashboard/struk/page.tsx`            | Modify | Responsive padding                                                     |
| `src/app/dashboard/akuntansi/page.tsx`        | Modify | Responsive padding                                                     |
| `src/app/dashboard/import/page.tsx`           | Modify | Responsive padding                                                     |

---

## Task 1: Table min-width for horizontal scroll

`Table.tsx` wrapper already has `overflow-x-auto` but the inner `<table>` is `w-full`, which forces it to compress instead of triggering scroll. Adding `min-w-[600px]` makes it scroll on narrow screens.

**Files:**

- Modify: `src/components/ui/Table.tsx`

- [ ] **Step 1: Update Table component**

Replace the inner table className in `src/components/ui/Table.tsx`:

```tsx
export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-gray-200 shadow-sm", className)}>
      <table className="w-full min-w-[600px] text-sm divide-y divide-gray-100">{children}</table>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/Table.tsx
git commit -m "fix: add min-w to Table for horizontal scroll on mobile"
```

---

## Task 2: Sidebar — icon rail + overlay drawer

Sidebar becomes fully CSS-driven for the two desktop modes (icon rail at `lg`, full at `xl`) and prop-driven for the mobile overlay.

**Key breakpoint mapping (Tailwind defaults):**

- `lg` = 1024px, `xl` = 1280px
- Icon rail at 1024–1279px = `lg:` classes overridden by `xl:` classes
- Overlay at <1024px = controlled by `open` prop

**Files:**

- Modify: `src/components/dashboard/Sidebar.tsx`

- [ ] **Step 1: Rewrite Sidebar component**

Full replacement of `src/components/dashboard/Sidebar.tsx`:

```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Truck,
  Users,
  ShoppingBag,
  ClipboardList,
  Tag,
  BarChart2,
  Printer,
  UserCog,
  Upload,
  LogOut,
  Receipt,
  Layers,
  Ruler,
  BookOpen,
  ListChecks,
  X,
} from "lucide-react"

type NavItem = { href: string; label: string; icon: React.ElementType; exact?: boolean }
type NavGroup = { label: string | null; items: NavItem[] }

const navGroups: NavGroup[] = [
  {
    label: null,
    items: [
      { href: "/dashboard", label: "Beranda", icon: LayoutDashboard, exact: true },
      { href: "/kasir", label: "Kasir", icon: ShoppingCart },
      { href: "/dashboard/transaksi", label: "Transaksi", icon: Receipt },
    ],
  },
  {
    label: "Katalog",
    items: [
      { href: "/dashboard/produk", label: "Produk", icon: Package },
      { href: "/dashboard/kategori", label: "Kategori", icon: Layers },
      { href: "/dashboard/satuan", label: "Satuan", icon: Ruler },
      { href: "/dashboard/supplier", label: "Supplier", icon: Truck },
    ],
  },
  {
    label: "Gudang",
    items: [
      { href: "/dashboard/purchase-order", label: "Purchase Order", icon: ShoppingBag },
      { href: "/dashboard/daftar-belanja", label: "Daftar Belanja", icon: ListChecks },
      { href: "/dashboard/stock-opname", label: "Stok Opname", icon: ClipboardList },
    ],
  },
  {
    label: "Bisnis",
    items: [
      { href: "/dashboard/customer", label: "Pelanggan", icon: Users },
      { href: "/dashboard/diskon", label: "Diskon", icon: Tag },
      { href: "/dashboard/akuntansi", label: "Akuntansi", icon: BookOpen },
      { href: "/dashboard/laporan", label: "Laporan", icon: BarChart2 },
    ],
  },
  {
    label: "Pengaturan",
    items: [
      { href: "/dashboard/struk", label: "Struk", icon: Printer },
      { href: "/dashboard/pengguna", label: "Pengguna", icon: UserCog },
      { href: "/dashboard/import", label: "Import GDB", icon: Upload },
    ],
  },
]

interface SidebarProps {
  userName: string
  userRole: string
  open: boolean
  onClose: () => void
}

export function Sidebar({ userName, userRole, open, onClose }: SidebarProps) {
  const pathname = usePathname()

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href
    return pathname.startsWith(item.href)
  }

  return (
    <>
      {/* Backdrop — mobile only, when open */}
      {open && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />}

      <aside
        className={cn(
          "flex flex-col bg-slate-900 h-screen",
          // Mobile: fixed overlay, full sidebar width
          "fixed inset-y-0 left-0 z-40 w-56",
          // Transition for mobile slide-in
          "transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
          // lg+: relative in flow, icon rail width, always visible
          "lg:relative lg:translate-x-0 lg:w-[68px] lg:z-auto",
          // xl+: full sidebar width
          "xl:w-56",
        )}
      >
        {/* Logo */}
        <div className="px-3 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
              <ShoppingCart size={15} className="text-white" />
            </div>
            <div className="hidden xl:block min-w-0">
              <p className="font-bold text-white text-sm leading-tight">Kasir</p>
              <p className="text-xs text-slate-400">POS & Inventori</p>
            </div>
          </div>
          {/* Close button — mobile overlay only */}
          <button
            onClick={onClose}
            className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {navGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "mt-3" : ""}>
              {group.label && (
                <p className="hidden xl:block text-[10px] font-bold text-slate-600 uppercase tracking-widest px-3 mb-1">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const active = isActive(item)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    title={item.label}
                    className={cn(
                      "flex items-center rounded-lg transition-all mb-0.5",
                      // lg (rail): icon centered, fixed size
                      "lg:w-[52px] lg:h-10 lg:justify-center lg:px-0 lg:py-0",
                      // xl (full): icon + label inline
                      "xl:w-auto xl:h-auto xl:justify-start xl:px-3 xl:py-2 xl:gap-2.5",
                      // Mobile (overlay full sidebar): icon + label
                      "px-3 py-2 gap-2.5",
                      active
                        ? "bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-900/40"
                        : "text-slate-400 hover:text-white hover:bg-slate-800",
                    )}
                  >
                    <item.icon
                      size={15}
                      className={cn("shrink-0", active ? "text-white" : "text-slate-500")}
                    />
                    <span className="lg:hidden xl:inline text-sm">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* User / Logout */}
        <div className="p-2 border-t border-slate-800">
          <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden xl:block min-w-0">
              <p className="text-xs font-semibold text-white truncate">{userName}</p>
              <p className="text-xs text-slate-500">{userRole}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={cn(
              "flex items-center rounded-lg text-xs text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-colors w-full",
              "lg:w-[52px] lg:h-10 lg:justify-center lg:px-0",
              "xl:w-auto xl:h-auto xl:justify-start xl:px-3 xl:py-2 xl:gap-2.5",
              "px-3 py-2 gap-2.5",
            )}
            title="Keluar"
          >
            <LogOut size={14} />
            <span className="lg:hidden xl:inline">Keluar</span>
          </button>
        </div>
      </aside>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/Sidebar.tsx
git commit -m "feat: sidebar responsive — icon rail at lg, overlay drawer at <lg"
```

---

## Task 3: DashboardShell + layout wiring

`layout.tsx` must stay a server component (it calls `auth()`). Extract a `DashboardShell` client component to own `sidebarOpen` state and render the mobile header.

**Files:**

- Create: `src/components/dashboard/DashboardShell.tsx`
- Modify: `src/app/dashboard/layout.tsx`

- [ ] **Step 1: Create DashboardShell**

Create `src/components/dashboard/DashboardShell.tsx`:

```tsx
"use client"

import { useState, type ReactNode } from "react"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { Menu, ShoppingCart } from "lucide-react"

interface DashboardShellProps {
  userName: string
  userRole: string
  children: ReactNode
}

export function DashboardShell({ userName, userRole, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar
        userName={userName}
        userRole={userRole}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header — hidden at lg+ where sidebar is always visible */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Buka menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
              <ShoppingCart size={13} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">Kasir</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto min-h-0">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update layout.tsx**

Replace `src/app/dashboard/layout.tsx`:

```tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"
import { DashboardShell } from "@/components/dashboard/DashboardShell"

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") redirect("/kasir")

  return (
    <DashboardShell userName={session.user.name ?? "Admin"} userRole={session.user.role}>
      {children}
    </DashboardShell>
  )
}
```

- [ ] **Step 3: Verify dev server**

Run `npm run dev` and open `http://localhost:3000/dashboard`.

Expected at ≥1280px: full sidebar visible, no mobile header.  
Expected at 1024–1279px: icon rail (icons + short labels, 68px wide), no mobile header.  
Expected at <1024px: no sidebar, mobile header with hamburger; tap hamburger → full sidebar slides in; tap backdrop → closes.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/DashboardShell.tsx src/app/dashboard/layout.tsx
git commit -m "feat: DashboardShell client wrapper with mobile sidebar toggle"
```

---

## Task 4: POS responsive

**Two changes:**

1. Payment panel width: `w-[368px]` → `w-[280px] xl:w-[368px]` (tablet fits 60/40 split)
2. Mobile (<768px = `md` in Tailwind): tabs UI with cart/payment switching

**Files:**

- Modify: `src/app/kasir/page.tsx`
- Modify: `src/components/pos/CartPanel.tsx`
- Modify: `src/components/pos/PaymentPanel.tsx`

- [ ] **Step 1: Add `onGoToPayment` prop to CartPanel**

In `src/components/pos/CartPanel.tsx`, update the component signature and add a sticky mobile total bar.

Change the function signature from:

```tsx
export function CartPanel({ onClear }: { onClear?: () => void }) {
```

to:

```tsx
export function CartPanel({ onClear, onGoToPayment }: { onClear?: () => void; onGoToPayment?: () => void }) {
```

Inside the function, add store access for total (add this line after the existing destructure):

```tsx
const store = usePosStore()
```

The existing line is:

```tsx
const { items, removeItem, updateQty } = usePosStore()
```

Replace it with:

```tsx
const store = usePosStore()
const { items, removeItem, updateQty } = store
```

In the non-empty return block, the outermost `div` is currently:

```tsx
<div className="flex-1 overflow-y-auto">
```

Wrap it in a fragment and add the sticky footer after the scrollable div:

```tsx
return (
  <div className="flex-1 flex flex-col overflow-hidden">
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-2.5 bg-gray-100 border-b border-gray-200 flex items-center justify-between sticky top-0 z-10">
        ... (existing header unchanged)
      </div>
      <table className="w-full">... (existing table unchanged)</table>
    </div>

    {/* Mobile sticky total bar — only shown when onGoToPayment is provided */}
    {onGoToPayment && items.length > 0 && (
      <div className="md:hidden sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-lg font-black text-gray-900 tabular-nums">
            {formatRupiah(store.getTotal())}
          </p>
        </div>
        <button
          onClick={onGoToPayment}
          className="bg-indigo-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm"
        >
          Bayar →
        </button>
      </div>
    )}
  </div>
)
```

Note: the empty-cart return block stays as-is (no total bar when empty).

- [ ] **Step 2: Add `onBack` prop to PaymentPanel**

In `src/components/pos/PaymentPanel.tsx`, update the interface and add a back button:

Add `onBack?: () => void` to the `PaymentPanelProps` interface:

```tsx
interface PaymentPanelProps {
  paymentMethods: PaymentMethod[]
  discounts: Discount[]
  onCheckout: () => void
  loading: boolean
  skipPrint: boolean
  onSkipPrintChange: (v: boolean) => void
  onBack?: () => void
}
```

Update function signature:

```tsx
export function PaymentPanel({
  paymentMethods,
  discounts,
  onCheckout,
  loading,
  skipPrint,
  onSkipPrintChange,
  onBack,
}: PaymentPanelProps) {
```

Add import for `ChevronLeft`:

```tsx
import { ChevronLeft } from "lucide-react"
```

At the top of the return JSX (before the orange total card), add:

```tsx
    <div className="flex flex-col gap-4">
      {onBack && (
        <button
          onClick={onBack}
          className="md:hidden flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors -mb-1"
        >
          <ChevronLeft size={16} />
          Keranjang
        </button>
      )}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 ...">
```

- [ ] **Step 3: Update kasir/page.tsx**

Add `activeTab` state and wire responsive layout. In `src/app/kasir/page.tsx`:

Add to imports:

```tsx
import { ShoppingCart as CartIcon, CreditCard } from "lucide-react"
```

Add state after `skipPrint` state:

```tsx
const [activeTab, setActiveTab] = useState<"cart" | "payment">("cart")
```

Find the main content area (currently):

```tsx
<div className="flex flex-1 overflow-hidden">
  <div className="flex-1 flex flex-col overflow-hidden bg-white border-r border-gray-200">
    <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
      <div className="flex-1">
        <ProductSearch onSelect={handleSearchSelect} />
      </div>
      <div className="shrink-0">
        <Select
          value={store.customerId ? String(store.customerId) : ""}
          onChange={(v) => store.setCustomer(v ? Number(v) : null)}
          options={customers.map((c) => ({
            value: String(c.id),
            label: c.name,
          }))}
          placeholder="Tanpa pelanggan"
          className="min-w-[160px]"
        />
      </div>
    </div>
    <CartPanel
      onClear={
        store.items.length > 0
          ? () => {
              store.reset()
              if (umumIdRef.current) store.setCustomer(umumIdRef.current)
            }
          : undefined
      }
    />
  </div>

  <div className="w-[368px] shrink-0 overflow-y-auto bg-gray-50 p-5">
    <PaymentPanel
      paymentMethods={paymentMethods}
      discounts={discounts}
      onCheckout={handleCheckout}
      loading={loading}
      skipPrint={skipPrint}
      onSkipPrintChange={setSkipPrint}
    />
  </div>
</div>
```

Replace with:

```tsx
      {/* Mobile tab bar */}
      <div className="md:hidden flex shrink-0 border-b border-gray-200 bg-white">
        <button
          onClick={() => setActiveTab("cart")}
          className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
            activeTab === "cart"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500"
          }`}
        >
          <CartIcon size={15} />
          Keranjang
          {store.items.length > 0 && (
            <span className="bg-indigo-600 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">
              {store.items.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("payment")}
          className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
            activeTab === "payment"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500"
          }`}
        >
          <CreditCard size={15} />
          Bayar
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          className={`flex-col overflow-hidden bg-white border-r border-gray-200 flex-1 ${
            activeTab === "cart" ? "flex" : "hidden md:flex"
          }`}
        >
          <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <div className="flex-1">
              <ProductSearch onSelect={handleSearchSelect} />
            </div>
            <div className="shrink-0">
              <Select
                value={store.customerId ? String(store.customerId) : ""}
                onChange={(v) => store.setCustomer(v ? Number(v) : null)}
                options={customers.map((c) => ({
                  value: String(c.id),
                  label: c.name,
                }))}
                placeholder="Tanpa pelanggan"
                className="min-w-[160px]"
              />
            </div>
          </div>
          <CartPanel
            onClear={
              store.items.length > 0
                ? () => {
                    store.reset()
                    if (umumIdRef.current) store.setCustomer(umumIdRef.current)
                  }
                : undefined
            }
            onGoToPayment={() => setActiveTab("payment")}
          />
        </div>

        <div
          className={`shrink-0 overflow-y-auto bg-gray-50 p-4 md:p-5 w-full md:w-[280px] xl:w-[368px] ${
            activeTab === "payment" ? "flex flex-col" : "hidden md:flex md:flex-col"
          }`}
        >
          <PaymentPanel
            paymentMethods={paymentMethods}
            discounts={discounts}
            onCheckout={handleCheckout}
            loading={loading}
            skipPrint={skipPrint}
            onSkipPrintChange={setSkipPrint}
            onBack={() => setActiveTab("cart")}
          />
        </div>
      </div>
```

- [ ] **Step 4: Verify POS**

Run `npm run dev`, open `http://localhost:3000/kasir`.

Expected at ≥1280px: side-by-side, payment panel 368px wide. No tab bar.  
Expected at 768–1279px: side-by-side, payment panel 280px wide. No tab bar.  
Expected at <768px: tab bar visible. Keranjang tab shows cart. Bayar tab shows payment. "Bayar →" button in cart footer switches to payment tab. "← Keranjang" button in payment switches back.

- [ ] **Step 5: Commit**

```bash
git add src/app/kasir/page.tsx src/components/pos/CartPanel.tsx src/components/pos/PaymentPanel.tsx
git commit -m "feat: POS responsive — tabs on mobile, narrower payment panel on tablet"
```

---

## Task 5: Dashboard pages — responsive padding + page headers

All dashboard pages use `p-6` or `p-8`. These should shrink on smaller screens. Page title bars (`flex justify-between`) need `flex-wrap` to prevent button overflow.

**Pattern for padding** — change outer wrapper:

- `p-6` → `p-4 md:p-6`
- `p-8` → `p-4 md:p-8`

**Pattern for page title bars** — add `flex-wrap gap-3 items-start`:

```tsx
// Before:
<div className="flex justify-between items-center mb-4">

// After:
<div className="flex flex-wrap justify-between items-start gap-3 mb-4">
```

**Files to update (padding only unless noted):**

- [ ] **Step 1: `src/app/dashboard/page.tsx`**

Change `<div className="p-8">` → `<div className="p-4 md:p-8">` (line 208).

- [ ] **Step 2: `src/app/dashboard/transaksi/page.tsx`**

Change outer wrapper padding: `p-6` → `p-4 md:p-6`.  
Change page title bar: `flex justify-between items-center` → `flex flex-wrap justify-between items-start gap-3`.

- [ ] **Step 3: `src/app/dashboard/produk/page.tsx`**

Change outer wrapper padding: `p-6` → `p-4 md:p-6`.  
Change page title bar: `flex justify-between items-center` → `flex flex-wrap justify-between items-start gap-3`.

- [ ] **Step 4: `src/app/dashboard/kategori/page.tsx`**

Change outer wrapper padding: `p-6` → `p-4 md:p-6`.  
Change page title bar: `flex justify-between items-center` → `flex flex-wrap justify-between items-start gap-3`.

- [ ] **Step 5: `src/app/dashboard/satuan/page.tsx`**

Change outer wrapper padding: `p-6` → `p-4 md:p-6`.  
Change page title bar: `flex justify-between items-center` → `flex flex-wrap justify-between items-start gap-3`.

- [ ] **Step 6: `src/app/dashboard/supplier/page.tsx`**

Change outer wrapper padding: `p-6` → `p-4 md:p-6`.  
Change page title bar: `flex justify-between items-center` → `flex flex-wrap justify-between items-start gap-3`.

- [ ] **Step 7: `src/app/dashboard/customer/page.tsx`**

Change outer wrapper padding: `p-6` → `p-4 md:p-6`.  
Change page title bar: `flex justify-between items-center` → `flex flex-wrap justify-between items-start gap-3`.

- [ ] **Step 8: `src/app/dashboard/purchase-order/page.tsx`**

Change outer wrapper padding: `p-6` → `p-4 md:p-6`.  
Change page title bar: `flex justify-between items-center` → `flex flex-wrap justify-between items-start gap-3`.

- [ ] **Step 9: `src/app/dashboard/daftar-belanja/page.tsx`**

Change outer wrapper padding: `p-6` → `p-4 md:p-6`.  
Change page title bar: `flex justify-between items-center` → `flex flex-wrap justify-between items-start gap-3`.

- [ ] **Step 10: `src/app/dashboard/stock-opname/page.tsx`**

Change outer wrapper padding: `p-6` → `p-4 md:p-6`.  
Change page title bar: `flex justify-between items-center` → `flex flex-wrap justify-between items-start gap-3`.

- [ ] **Step 11: `src/app/dashboard/laporan/page.tsx`**

Change outer wrapper padding: `p-6` or `p-8` → `p-4 md:p-6`.  
Change stat card grids: any `grid-cols-4` → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`.

- [ ] **Step 12: `src/app/dashboard/diskon/page.tsx`**

Change outer wrapper padding: `p-6` → `p-4 md:p-6`.  
Change page title bar: `flex justify-between items-center` → `flex flex-wrap justify-between items-start gap-3`.

- [ ] **Step 13: `src/app/dashboard/pengguna/page.tsx`**

Change outer wrapper padding: `p-6` → `p-4 md:p-6`.  
Change page title bar: `flex justify-between items-center` → `flex flex-wrap justify-between items-start gap-3`.

- [ ] **Step 14: `src/app/dashboard/struk/page.tsx`**

Change outer wrapper padding: `p-6` → `p-4 md:p-6`.

- [ ] **Step 15: `src/app/dashboard/akuntansi/page.tsx`**

Change outer wrapper padding: `p-6` → `p-4 md:p-6`.

- [ ] **Step 16: `src/app/dashboard/import/page.tsx`**

Change outer wrapper padding: `p-6` → `p-4 md:p-6`.

- [ ] **Step 17: Commit**

```bash
git add src/app/dashboard/
git commit -m "fix: responsive padding and page headers on all dashboard pages"
```

---

## Self-Review Notes

- **Spec coverage:** ✅ Sidebar icon rail (lg), overlay drawer (<lg), DashboardShell, POS tabs (<768px), POS split (768–1024px), payment width, dashboard padding, table scroll, modals (already responsive with `w-full max-w-md p-4`).
- **Modal.tsx:** No change needed — already has `w-full max-w-md` + outer `p-4` container.
- **dashboard/page.tsx stat cards:** Grid is already `grid-cols-2 lg:grid-cols-4` — no change needed beyond padding.
- **Type consistency:** `SidebarProps` adds `open: boolean` + `onClose: () => void`. `DashboardShell` passes both. `CartPanel` adds `onGoToPayment?: () => void`. `PaymentPanel` adds `onBack?: () => void`. All optional props — no breaking changes.
- **`sticky top-0` in main layout:** After Task 3, the main area is `flex-1 overflow-auto`. The mobile header uses `sticky top-0 z-20`. The dashboard `<main>` needs `min-h-0` (added in DashboardShell) so flex scroll works correctly in nested flex containers.
