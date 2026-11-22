import { isValidElement } from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { Spinner } from "@noroset/ui/components/spinner"
import { cn } from "@noroset/ui/lib/utils"

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 touch-manipulation items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[background-color,color,border-color,box-shadow,transform] outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background duration-150 ease-fluent disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 active:bg-primary/80 *:data-[slot=button-loading-indicator]:text-primary-foreground",
        outline:
          "border-input bg-card text-foreground shadow-xs hover:bg-muted aria-expanded:bg-muted *:data-[slot=button-loading-indicator]:text-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground *:data-[slot=button-loading-indicator]:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground active:text-muted-foreground aria-expanded:bg-muted aria-expanded:text-foreground *:data-[slot=button-loading-indicator]:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 *:data-[slot=button-loading-indicator]:text-destructive dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline *:data-[slot=button-loading-indicator]:text-primary",
        blue: "bg-primary text-primary-foreground hover:bg-primary/90 *:data-[slot=button-loading-indicator]:text-primary-foreground",
        "blue-subtle":
          "bg-primary/10 text-primary hover:bg-primary/15 *:data-[slot=button-loading-indicator]:text-primary",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pe-2 has-data-[icon=inline-start]:ps-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pe-1.5 has-data-[icon=inline-start]:ps-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pe-1.5 has-data-[icon=inline-start]:ps-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pe-2 has-data-[icon=inline-start]:ps-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/** Matches each button size's own icon size, since Spinner sets its own default and would otherwise skip the base `[&_svg:not([class*='size-'])]` auto-sizing. */
const loadingIndicatorSizeBySize: Record<
  NonNullable<VariantProps<typeof buttonVariants>["size"]>,
  string
> = {
  default: "size-4",
  xs: "size-3",
  sm: "size-3.5",
  lg: "size-4",
  icon: "size-4",
  "icon-xs": "size-3",
  "icon-sm": "size-3.5",
  "icon-lg": "size-4",
}

function Button({
  className,
  variant = "default",
  size = "default",
  loading = false,
  disabled,
  children,
  nativeButton,
  render,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean
  }) {
  const loadingIndicatorSize = loadingIndicatorSizeBySize[size ?? "default"]
  const effectiveNativeButton =
    nativeButton ??
    (isValidElement(render) && render.type !== "button" ? false : undefined)

  return (
    <ButtonPrimitive
      data-slot="button"
      data-loading={loading ? "" : undefined}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size, className }))}
      nativeButton={effectiveNativeButton}
      render={render}
      {...props}
    >
      {loading && (
        <Spinner
          data-slot="button-loading-indicator"
          data-icon="inline-start"
          className={loadingIndicatorSize}
        />
      )}
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
