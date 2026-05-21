import { cn } from "@/lib/utils"

type ToggleProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  size?: "sm" | "md"
  className?: string
}

export function Toggle({ checked, onChange, label, size = "md", className }: ToggleProps) {
  const trackW = size === "sm" ? "w-8" : "w-10"
  const trackH = size === "sm" ? "h-4" : "h-5"
  const thumbSize = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"
  const translate = size === "sm" ? "translate-x-4" : "translate-x-5"

  return (
    <label className={cn("inline-flex items-center gap-2 cursor-pointer select-none", className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
          trackW,
          trackH,
          checked ? "bg-emerald-500" : "bg-gray-300",
        )}
      >
        <span
          className={cn(
            "inline-block rounded-full bg-white shadow-sm transition-transform duration-200 ml-0.5",
            thumbSize,
            checked ? translate : "translate-x-0",
          )}
        />
      </button>
      {label && <span className="text-xs font-semibold text-gray-600">{label}</span>}
    </label>
  )
}
