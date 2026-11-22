"use client"

import * as React from "react"
import { cn } from "@noroset/ui/lib/utils"

function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
  ...props
}: {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick">) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange?.(!checked)}
      data-slot="switch"
      data-state={checked ? "checked" : "unchecked"}
      className={cn(
        "group/switch relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border transition-colors duration-150 ease-fluent outline-none",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        "border-input",
        "data-[state=checked]:border-foreground data-[state=checked]:bg-foreground",
        className,
      )}
      {...props}
    >
      <span
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none absolute top-1/2 block size-3 -translate-y-1/2 rounded-full transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-150 ease-fluent",
          "start-[3px] bg-muted-foreground",
          "group-data-[state=checked]/switch:start-[calc(100%-1rem)] group-data-[state=checked]/switch:bg-background",
        )}
      />
    </button>
  )
}

export { Switch }
