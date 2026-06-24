import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { usePlatform } from "@/mobile/hooks/usePlatform";
import { cn } from "@/lib/utils";
import { getBottomTabItems, isActiveRoute, shouldShowBottomNav } from "./navigationConfig";

export function MobileTabBar() {
  const { user } = useAuth();
  const { isNativePhone } = usePlatform();
  const location = useLocation();

  if (!isNativePhone || !shouldShowBottomNav(location.pathname, user)) {
    return null;
  }

  const items = getBottomTabItems(user);

  return (
    <nav className="native-bottom-tabbar" aria-label="Primary app navigation">
      <div className="native-bottom-tabbar-shell">
        {items.map((item) => {
          const active = isActiveRoute(location.pathname, item.to);

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn("native-bottom-tabbar-link", active && "native-bottom-tabbar-link-active")}
              aria-current={active ? "page" : undefined}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}