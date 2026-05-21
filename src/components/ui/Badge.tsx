import { cn } from "@/lib/utils"

type Variant = "success" | "warning" | "danger" | "default"

const styles: Record<Variant, string> = {
  success: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  danger: "bg-red-100 text-red-800",
  default: "bg-gray-100 text-gray-700",
}

export function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: Variant }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", styles[variant])}>
      {children}
    </span>
  )
}
