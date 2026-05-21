"use client"

import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  sub?: string
  variant?: "default" | "success" | "warning" | "danger"
  className?: string
}

const variantMap = {
  default: {
    border: "border-gray-200",
    iconBg: "bg-indigo-100",
    valueCls: "text-gray-900",
    cardBg: "bg-white",
  },
  success: {
    border: "border-emerald-100",
    iconBg: "bg-emerald-100",
    valueCls: "text-emerald-700",
    cardBg: "bg-white",
  },
  warning: {
    border: "border-amber-200",
    iconBg: "bg-amber-100",
    valueCls: "text-amber-700",
    cardBg: "bg-amber-50",
  },
  danger: {
    border: "border-red-100",
    iconBg: "bg-red-100",
    valueCls: "text-red-600",
    cardBg: "bg-white",
  },
}

export function StatCard({
  label,
  value,
  icon,
  sub,
  variant = "default",
  className,
}: StatCardProps) {
  const v = variantMap[variant]

  if (icon) {
    return (
      <div
        className={cn(
          "border rounded-xl p-4 flex items-center gap-3",
          v.cardBg,
          v.border,
          className
        )}
      >
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", v.iconBg)}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className={cn("text-xl font-black tabular-nums", v.valueCls)}>
            {value}
          </p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "border rounded-xl p-4",
        v.cardBg,
        v.border,
        className
      )}
    >
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      <p className={cn("text-xl font-black tabular-nums", v.valueCls)}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}
