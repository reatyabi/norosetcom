"use client"

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { CheckIcon, MinusIcon } from "lucide-react"

import { cn } from "@noroset/ui/lib/utils"

/** چک‌باکس Base UI؛ حالت میانه (indeterminate) با خط تیره نشان داده می‌شود. */
function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "group/checkbox inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input bg-card text-primary-foreground transition-colors duration-150 outline-none select-none",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
        "data-[checked]:border-primary data-[checked]:bg-primary data-[indeterminate]:border-primary data-[indeterminate]:bg-primary",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current"
      >
        <CheckIcon className="size-3 group-data-[indeterminate]/checkbox:hidden" strokeWidth={3} />
        <MinusIcon className="hidden size-3 group-data-[indeterminate]/checkbox:block" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
