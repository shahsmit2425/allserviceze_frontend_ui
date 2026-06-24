import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "./ui/drawer";
import { usePlatform } from "@/mobile/hooks/usePlatform";
import { cn } from "@/lib/utils";

export default function ResponsiveFilterModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  bodyClassName,
}) {
  const { isNative } = usePlatform();
  const [isCompactViewport, setIsCompactViewport] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 767px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateViewport = (event) => setIsCompactViewport(event.matches);

    setIsCompactViewport(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateViewport);
      return () => mediaQuery.removeEventListener("change", updateViewport);
    }

    mediaQuery.addListener(updateViewport);
    return () => mediaQuery.removeListener(updateViewport);
  }, []);

  const useDrawer = isNative || isCompactViewport;

  if (useDrawer) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
        <DrawerContent className={cn("max-h-[92vh] rounded-t-[1.6rem] border-border bg-card px-0 pb-0", className)}>
          <DrawerHeader className="border-b border-border/70 px-5 pb-4 pt-3 text-left">
            <DrawerTitle className="text-xl font-semibold tracking-[-0.04em] text-foreground">{title}</DrawerTitle>
            {description ? <DrawerDescription className="mt-2 text-sm leading-6 text-muted-foreground">{description}</DrawerDescription> : null}
          </DrawerHeader>
          <div className={cn("overflow-y-auto px-5 py-4", bodyClassName)}>{children}</div>
          {footer ? <DrawerFooter className="mobile-form-tray border-t border-border/70 bg-card/98 px-5 py-4">{footer}</DrawerFooter> : null}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-2xl overflow-hidden p-0", className)}>
        <DialogHeader className="border-b border-border/70 px-6 pb-5 pt-6 text-left">
          <DialogTitle className="text-xl font-semibold tracking-[-0.04em] text-foreground">{title}</DialogTitle>
          {description ? <DialogDescription className="mt-2 text-sm leading-6 text-muted-foreground">{description}</DialogDescription> : null}
        </DialogHeader>
        <div className={cn("max-h-[70vh] overflow-y-auto px-6 py-5", bodyClassName)}>{children}</div>
        {footer ? <div className="flex flex-col gap-2 border-t border-border/70 px-6 py-4 sm:flex-row sm:justify-end">{footer}</div> : null}
      </DialogContent>
    </Dialog>
  );
}