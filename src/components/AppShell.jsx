import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";
import { usePlatform } from "@/mobile/hooks/usePlatform";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "react-router-dom";
import { MobileTabBar } from "./MobileTabBar";
import { shouldShowBottomNav } from "./navigationConfig";

const isLandingOrAuthPage = (pathname) => {
  return pathname === "/" || pathname.startsWith("/auth");
};

export function AppShell({ children, theme, className, contentClassName, navbarVariant, ...props }) {
  const { deviceClass, isNative, isNativePhone, isNativeTablet, platform } = usePlatform();
  const { user } = useAuth();
  const location = useLocation();
  const hasBottomNav = isNativePhone && shouldShowBottomNav(location.pathname, user);
  const showSidebar = user && !isLandingOrAuthPage(location.pathname);

  return (
    <div
      className={cn(
        "app-shell",
        isNativePhone && "app-shell-native-phone",
        isNativeTablet && "app-shell-native-tablet",
        hasBottomNav && "app-shell-has-bottom-nav",
        className
      )}
      data-theme={theme}
      data-device-class={deviceClass}
      data-has-bottom-nav={hasBottomNav ? "true" : "false"}
      data-native={isNative ? "true" : "false"}
      data-platform={platform}
      {...props}
    >
      {showSidebar ? <Sidebar /> : <Navbar variant={navbarVariant} />}
      <main className={cn("app-shell-main", contentClassName)}>{children}</main>
      {hasBottomNav ? <MobileTabBar /> : null}
    </div>
  );
}
