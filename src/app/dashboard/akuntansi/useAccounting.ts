"use client"

import { useState, useEffect, useCallback } from "react"

export type Entry = {
  id: string
  type: "income" | "expense"
  amount: number
  description: string
  date: string
  ref: { type: string; id: number }
}

export type AccountingData = {
  entries: Entry[]
  totalIncome: number
  totalExpense: number
  balance: number
}

const EMPTY = ""

export function useAccounting() {
  const [data, setData] = useState<AccountingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterFrom, setFilterFrom] = useState(EMPTY)
  const [filterTo, setFilterTo] = useState(EMPTY)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterFrom) params.set("from", filterFrom)
    if (filterTo) params.set("to", filterTo)
    const res = await fetch(`/api/accounting?${params}`)
    setData(await res.json())
    setLoading(false)
  }, [filterFrom, filterTo])

  useEffect(() => {
    load()
  }, [load])

  function resetFilters() {
    setFilterFrom(EMPTY)
    setFilterTo(EMPTY)
  }

  return { data, loading, filterFrom, setFilterFrom, filterTo, setFilterTo, resetFilters }
}
