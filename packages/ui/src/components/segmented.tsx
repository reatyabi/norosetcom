"use client"

import * as React from "react"
import { cn } from "@noroset/ui/lib/utils"

interface SegmentedItem<T extends string> {
  value: T
  label: React.ReactNode
}

function Segmented<T extends string = string>({
  value,
  onChange,
  items,
  className,
}: {
  value: T
  onChange: (v: T) => void
  items: SegmentedItem<T>[]
  className?: string
}) {
  return (
    <div
      role="group"
      data-slot="segmented"
      className={cn("flex gap-0.5 rounded-lg bg-muted p-0.5", className)}
    >
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          onClick={() => onChange(it.value)}
          aria-pressed={value === it.value}
          data-state={value === it.value ? "active" : "inactive"}
          className={cn(
            "flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-xs transition-colors duration-150 ease-fluent [&_svg]:size-3.5 [&_svg]:shrink-0",
            value === it.value
              ? "bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

export { Segmented }
export type { SegmentedItem }
