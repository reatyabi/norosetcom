import * as React from "react"

import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@noroset/ui/lib/utils"

/**
 * بلوک، سطح سبک‌تر از Card برای گروه‌بندی محتوا داخل کارت است (Nova):
 * - default: سطح ۲ با پس‌زمینه‌ی ملایم
 * - muted: سطح ۲ خنثی‌تر
 * - outline: سطح ۲ فقط با خط
 * - inset: سطح ۳ فرورفته
 * - accent: بلوک تأکیدی با رنگ primary
 * - ghost: بدون قاب، فقط برای فاصله‌گذاری/گروه‌بندی
 *
 * قاعده: بیش از سه سطح تودرتو استفاده نشود و در سطح ۲/۳ سایه اضافه نشود.
 */
const blockVariants = cva(
  "group/block flex min-w-0 flex-col rounded-lg border text-sm",
  {
    variants: {
      variant: {
        default: "border-border/70 bg-surface-2",
        muted: "border-border/60 bg-muted/40",
        outline: "border-border bg-transparent",
        inset: "border-border/60 bg-surface-3",
        accent: "border-primary/15 bg-primary/5",
        ghost: "border-transparent bg-transparent",
      },
      size: {
        default: "gap-2 p-3",
        sm: "gap-1.5 p-2.5",
        lg: "gap-3 p-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Block({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof blockVariants>) {
  return (
    <div
      data-slot="block"
      data-variant={variant ?? "default"}
      className={cn(blockVariants({ variant, size }), className)}
      {...props}
    />
  )
}

function BlockHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="block-header"
      className={cn(
        "flex min-w-0 items-start justify-between gap-2 has-data-[slot=block-action]:flex-nowrap",
        className
      )}
      {...props}
    />
  )
}

function BlockTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="block-title"
      className={cn("min-w-0 font-medium leading-snug text-foreground", className)}
      {...props}
    />
  )
}

function BlockDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="block-description"
      className={cn("text-xs leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  )
}

function BlockAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="block-action"
      className={cn("shrink-0 self-start", className)}
      {...props}
    />
  )
}

function BlockContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="block-content"
      className={cn("min-w-0", className)}
      {...props}
    />
  )
}

function BlockFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="block-footer"
      className={cn(
        "flex flex-wrap items-center gap-2 border-t border-border/60 pt-2",
        className
      )}
      {...props}
    />
  )
}

export {
  Block,
  BlockAction,
  BlockContent,
  BlockDescription,
  BlockFooter,
  BlockHeader,
  BlockTitle,
  blockVariants,
}
