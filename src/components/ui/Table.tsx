import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-lg border border-gray-200", className)}>
      <table className="w-full text-sm divide-y divide-gray-200">{children}</table>
    </div>
  )
}

export function Thead({ children }: { children: ReactNode }) {
  return <thead className="bg-gray-50">{children}</thead>
}

export function Tbody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-gray-100 bg-white">{children}</tbody>
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th className={cn("px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", className)}>
      {children}
    </th>
  )
}

export function Td({ children, className, colSpan }: { children: ReactNode; className?: string; colSpan?: number }) {
  return <td colSpan={colSpan} className={cn("px-4 py-3 text-gray-900", className)}>{children}</td>
}
