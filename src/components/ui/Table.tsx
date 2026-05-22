import type { MouseEventHandler, ReactNode } from "react"
import { cn } from "@/lib/utils"

export function Table({
  children,
  className,
  minWidth = "min-w-[600px]",
}: {
  children: ReactNode
  className?: string
  minWidth?: string
}) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-gray-200 shadow-sm", className)}>
      <table className={cn("w-full text-sm divide-y divide-gray-100", minWidth)}>{children}</table>
    </div>
  )
}

export function Thead({ children }: { children: ReactNode }) {
  return <thead className="bg-gray-50/80">{children}</thead>
}

export function Tbody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-gray-50 bg-white">{children}</tbody>
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider",
        className,
      )}
    >
      {children}
    </th>
  )
}

export function Td({
  children,
  className,
  colSpan,
  onClick,
}: {
  children?: ReactNode
  className?: string
  colSpan?: number
  onClick?: MouseEventHandler<HTMLTableCellElement>
}) {
  return (
    <td
      colSpan={colSpan}
      onClick={onClick}
      className={cn("px-4 py-3 text-gray-900 text-sm", className)}
    >
      {children}
    </td>
  )
}
