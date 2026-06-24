import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.75 py-1 text-[11px] font-semibold tracking-[0.08em] shadow-sm backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-primary/12 bg-primary/10 text-primary hover:bg-primary/14",
        secondary:
          "border-secondary/16 bg-secondary/12 text-secondary hover:bg-secondary/18",
        destructive:
          "border-destructive/10 bg-destructive/10 text-destructive hover:bg-destructive/20",
        outline: "border-border/82 bg-background text-foreground/82 hover:bg-card",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }
