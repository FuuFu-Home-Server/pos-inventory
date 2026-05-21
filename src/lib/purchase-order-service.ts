type PoItem = { qty: number; unitCost: number }

export function buildPoTotals(items: PoItem[]) {
  const itemsWithSubtotal = items.map((item) => ({
    ...item,
    subtotal: item.qty * item.unitCost,
  }))
  const grandTotal = itemsWithSubtotal.reduce((sum, i) => sum + i.subtotal, 0)
  return { itemsWithSubtotal, grandTotal }
}
