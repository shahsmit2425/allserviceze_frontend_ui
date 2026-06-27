import { useState } from "react";
import logger from "@/utils/logger";
import { useNotifications } from "../context/NotificationContext";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Trash2, Wifi, WifiOff } from "lucide-react";
import { Button } from "./ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { ScrollArea } from "./ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { getNotificationRoute } from "@/utils/notificationNavigation";
import { cn } from "@/lib/utils";

export const NotificationBell = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  
  // Get notifications from context - this ensures reactive updates
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
  } = useNotifications();

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Close popover
    setOpen(false);

    const route = getNotificationRoute(notification);
    if (route) {
      navigate(route);
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      system_test: "🧪",
      portfolio_added: "📁",
      portfolio_updated: "✏️",
      new_bid: "💰",
      bid_shortlisted: "⭐",
      bid_withdrawn: "↩️",
      project_awarded: "🏆",
      project_live: "🚀",
      project_approved: "✅",
      project_rejected: "⚠️",
      new_message: "💬",
      chat_message: "💬",
      new_review: "⭐",
      verification_approved: "✅",
      account_rejected: "⚠️",
      subscription_activated: "💳",
      subscription_cancelled: "🔔",
      subscription_reactivated: "🔄",
    };
    return icons[type] || "🔔";
  };

  logger.log("🔔 NotificationBell render - Unread:", unreadCount, "Total:", notifications.length);

  return (
    <div className="relative inline-flex">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-11 w-11 rounded-[1.1rem] border border-border/70 bg-muted/70 shadow-sm backdrop-blur-sm hover:bg-muted/95"
            data-testid="notification-bell"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span
                className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-background bg-primary px-1.5 text-[10px] font-bold text-primary-foreground shadow-md shadow-slate-900/20"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[23rem] overflow-hidden rounded-[1.5rem] border border-border/70 bg-popover/95 p-0 shadow-xl shadow-slate-950/30 backdrop-blur-xl" align="end">
          <div className="flex items-center justify-between border-b border-border/70 bg-muted/45 p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm shadow-slate-900/5">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-semibold tracking-[-0.02em]">Notifications</h4>
                <p className="text-xs text-muted-foreground">Live updates across web and iPhone</p>
              </div>
              {isConnected ? (
                <Wifi className="w-3 h-3 text-emerald-400" title="Connected" />
              ) : (
                <WifiOff className="w-3 h-3 text-rose-400" title="Disconnected" />
              )}
            </div>
            {notifications.length > 0 && (
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="rounded-full px-3 text-xs"
                  >
                    <CheckCheck className="w-4 h-4 mr-1" />
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllNotifications}
                  className="rounded-full px-3 text-xs"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Clear all
                </Button>
              </div>
            )}
          </div>
          <ScrollArea className="h-80">
            {notifications.length > 0 ? (
              <div className="divide-y divide-border/70">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "group cursor-pointer p-4 transition-all duration-200 hover:bg-muted/60",
                      !notification.read && "bg-primary/8"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted/60 text-xl shadow-sm shadow-slate-900/5">
                        <span>{getNotificationIcon(notification.type)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm text-foreground/90", !notification.read && "font-semibold")}>
                          {notification.title}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="mt-2 h-2.5 w-2.5 rounded-full bg-primary shadow-sm shadow-slate-900/10" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-[1.35rem] bg-muted/60 shadow-sm shadow-slate-900/5">
                  <Bell className="h-6 w-6 opacity-60" />
                </div>
                <p className="text-sm font-medium text-foreground/75">No notifications yet</p>
                <p className="mt-1 max-w-[16rem] text-xs leading-5">Project updates, bids, and announcements will appear here.</p>
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
};
