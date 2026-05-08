import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/src/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-brand-600 text-white hover:bg-brand-700",
        destructive: "bg-red-600 text-white hover:bg-red-700",
        outline: "border border-surface-200 bg-white hover:bg-surface-50 text-slate-700",
        secondary: "bg-surface-100 text-slate-900 hover:bg-surface-200",
        ghost: "hover:bg-surface-100 text-slate-700",
        link: "text-brand-600 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 text-sm font-medium",
        sm: "h-8 rounded-md px-3 text-xs font-medium",
        lg: "h-10 rounded-lg px-6 text-sm font-medium",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
