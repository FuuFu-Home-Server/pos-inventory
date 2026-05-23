"use client"

import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

export function PageTransition({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const pathname = usePathname()
  return (
    <div key={pathname} className={`animate-page-in ${className ?? ""}`}>
      {children}
    </div>
  )
}
