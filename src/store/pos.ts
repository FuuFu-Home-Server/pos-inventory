import { create } from "zustand"

export type CartItem = {
  variantId: number
  productId: number
  productName: string
  variantName: string
  unit: string
  price: number
  qty: number
  itemDiscountAmt: number
  subtotal: number
}

export type StoredDiscount = {
  id: number
  type: string
  value: number
  scope: string
  minPurchase: number | null
}

type PosStore = {
  items: CartItem[]
  appliedDiscounts: StoredDiscount[]
  customerId: number | null
  paymentMethodId: number | null
  paymentAmount: number
  addItem: (item: Omit<CartItem, "qty" | "itemDiscountAmt" | "subtotal">) => void
  removeItem: (variantId: number) => void
  updateQty: (variantId: number, qty: number) => void
  changeVariant: (
    oldVariantId: number,
    newItem: Omit<CartItem, "qty" | "itemDiscountAmt" | "subtotal">,
  ) => void
  setItemDiscount: (variantId: number, amount: number) => void
  toggleDiscount: (discount: StoredDiscount) => void
  setCustomer: (customerId: number | null) => void
  setPaymentMethod: (id: number | null) => void
  setPaymentAmount: (amount: number) => void
  reset: () => void
  getSubtotal: () => number
  getDiscountAmounts: () => Record<number, number>
  getDiscountTotal: () => number
  getTotal: () => number
  getChange: () => number
}

const initialState = {
  items: [] as CartItem[],
  appliedDiscounts: [] as StoredDiscount[],
  customerId: null,
  paymentMethodId: null,
  paymentAmount: 0,
}

export const usePosStore = create<PosStore>((set, get) => ({
  ...initialState,

  addItem(item) {
    set((state) => {
      const existing = state.items.find((i) => i.variantId === item.variantId)
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.variantId === item.variantId
              ? { ...i, qty: i.qty + 1, subtotal: (i.qty + 1) * i.price - i.itemDiscountAmt }
              : i,
          ),
        }
      }
      return {
        items: [...state.items, { ...item, qty: 1, itemDiscountAmt: 0, subtotal: item.price }],
      }
    })
  },

  removeItem(variantId) {
    set((state) => ({ items: state.items.filter((i) => i.variantId !== variantId) }))
  },

  changeVariant(oldVariantId, newItem) {
    set((state) => ({
      items: state.items.map((i) =>
        i.variantId === oldVariantId
          ? {
              ...newItem,
              qty: i.qty,
              itemDiscountAmt: i.itemDiscountAmt,
              subtotal: i.qty * newItem.price - i.itemDiscountAmt,
            }
          : i,
      ),
    }))
  },

  updateQty(variantId, qty) {
    if (qty <= 0) {
      get().removeItem(variantId)
      return
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.variantId === variantId ? { ...i, qty, subtotal: qty * i.price - i.itemDiscountAmt } : i,
      ),
    }))
  },

  setItemDiscount(variantId, amount) {
    set((state) => ({
      items: state.items.map((i) =>
        i.variantId === variantId
          ? { ...i, itemDiscountAmt: amount, subtotal: i.qty * i.price - amount }
          : i,
      ),
    }))
  },

  toggleDiscount(discount) {
    set((state) => {
      const has = state.appliedDiscounts.some((d) => d.id === discount.id)
      return {
        appliedDiscounts: has
          ? state.appliedDiscounts.filter((d) => d.id !== discount.id)
          : [...state.appliedDiscounts, discount],
      }
    })
  },
  setCustomer(customerId) {
    set({ customerId })
  },
  setPaymentMethod(paymentMethodId) {
    set({ paymentMethodId })
  },
  setPaymentAmount(paymentAmount) {
    set({ paymentAmount })
  },
  reset() {
    set(initialState)
  },
  getSubtotal() {
    return get().items.reduce((sum, i) => sum + i.subtotal, 0)
  },
  getDiscountAmounts() {
    const subtotal = get().getSubtotal()
    return Object.fromEntries(
      get().appliedDiscounts.map((d) => {
        if (d.minPurchase != null && subtotal < d.minPurchase) return [d.id, 0]
        const amt =
          d.type === "PERCENT"
            ? Math.round((subtotal * d.value) / 100)
            : Math.min(d.value, subtotal)
        return [d.id, amt]
      }),
    )
  },
  getDiscountTotal() {
    return Object.values(get().getDiscountAmounts()).reduce((a, b) => a + b, 0)
  },
  getTotal() {
    return Math.max(0, get().getSubtotal() - get().getDiscountTotal())
  },
  getChange() {
    return get().paymentAmount - get().getTotal()
  },
}))
