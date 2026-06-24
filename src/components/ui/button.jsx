import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[1.05rem] text-sm font-semibold tracking-[0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--secondary))_100%)] text-primary-foreground shadow-[0_20px_40px_-26px_hsl(var(--primary)/0.38)] hover:-translate-y-[1px] hover:shadow-[0_24px_48px_-28px_hsl(var(--primary)/0.42)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_18px_36px_-24px_rgba(127,29,29,0.34)] hover:-translate-y-[1px] hover:bg-destructive/92",
        outline:
          "border border-border/90 bg-background text-foreground shadow-[0_14px_34px_-28px_rgba(15,23,42,0.12)] backdrop-blur-sm hover:border-primary/24 hover:bg-accent",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[0_18px_36px_-24px_hsl(var(--secondary)/0.28)] hover:-translate-y-[1px] hover:bg-secondary/94",
        ghost: "text-foreground/78 hover:bg-muted/70 hover:text-foreground",
        link: "text-primary underline-offset-4 decoration-primary/35 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-[0.95rem] px-4 text-sm",
        lg: "h-12 rounded-[1.15rem] px-8",
        icon: "h-10 w-10 rounded-[1rem]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
