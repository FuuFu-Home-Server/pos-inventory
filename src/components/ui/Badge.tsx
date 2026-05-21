import { cn } from "@/lib/utils"

type Variant = "success" | "warning" | "danger" | "default" | "info"

const styles: Record<Variant, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-1 ring-red-200",
  info: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  default: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
}

export function Badge({ children, variant = "default", className }: {
  children: React.ReactNode
  variant?: Variant
  className?: string
}) {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", styles[variant], className)}>
      {children}
    </span>
  )
}
