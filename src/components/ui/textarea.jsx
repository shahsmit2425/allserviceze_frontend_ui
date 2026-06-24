import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[120px] w-full rounded-[1.12rem] border border-input/90 bg-background px-4 py-3.5 text-base text-foreground shadow-[0_14px_34px_-28px_rgba(15,23,42,0.1)] backdrop-blur-sm transition-all duration-200 placeholder:text-muted-foreground/70 hover:border-primary/18 hover:bg-background focus-visible:border-primary/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props} />
  );
})
Textarea.displayName = "Textarea"

export { Textarea }
