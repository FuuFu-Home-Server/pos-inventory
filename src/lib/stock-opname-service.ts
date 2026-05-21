type OpnameItem = { systemQty: number; physicalQty: number }

export function calcDifferences<T extends OpnameItem>(items: T[]): (T & { difference: number })[] {
  return items.map((item) => ({ ...item, difference: item.physicalQty - item.systemQty }))
}
