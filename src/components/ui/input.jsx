import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-12 w-full rounded-[1.12rem] border border-border/90 bg-background px-4 py-3 text-[15px] text-foreground shadow-[0_14px_34px_-28px_rgba(15,23,42,0.1)] backdrop-blur-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/68 hover:border-primary/18 hover:bg-card focus-visible:border-primary/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/8 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props} />
  );
})
Input.displayName = "Input"

export { Input }
