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
                className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-background bg-primary px-1.5 text-[10px] font-bold text-primary-foreground shadow-md shadow-deep-navy-800/20"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[25rem] overflow-hidden rounded-xl border border-deep-navy-100 bg-white p-0 shadow-xl" align="end">
          <div className="flex items-start justify-between border-b border-deep-navy-100 bg-gradient-to-br from-white to-deep-navy-50 p-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-copper-100 text-copper-600 shadow-sm flex-shrink-0">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="font-bold text-deep-navy-900 text-base">Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-copper-500 text-white text-xs font-bold">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-xs text-deep-navy-500 flex items-center gap-1">
                  Live updates
                  {isConnected ? (
                    <><Wifi className="w-3 h-3 text-emerald-500" title="Connected" /> Connected</>
                  ) : (
                    <><WifiOff className="w-3 h-3 text-rose-500" title="Disconnected" /> Offline</>
                  )}
                </p>
              </div>
            </div>
            {notifications.length > 0 && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="rounded-lg px-2 text-xs hover:bg-deep-navy-100 text-deep-navy-600"
                    title="Mark all notifications as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllNotifications}
                  className="rounded-lg px-2 text-xs hover:bg-rose-50 text-rose-600"
                  title="Clear all notifications"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
          <ScrollArea className="h-80">
            {notifications.length > 0 ? (
              <div className="space-y-2 p-3">
                {notifications.map((notification) => {
                  // Determine notification type badge and color
                  const getNotificationType = (type) => {
                    const types = {
                      message: { label: "Message", color: "bg-blue-50 text-blue-700 border-blue-200" },
                      bid: { label: "Bid Update", color: "bg-copper-50 text-copper-700 border-copper-200" },
                      project: { label: "Project", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                      system: { label: "Update", color: "bg-purple-50 text-purple-700 border-purple-200" },
                      awarded: { label: "Awarded", color: "bg-green-50 text-green-700 border-green-200" }
                    };
                    return types[type] || types.system;
                  };

                  const notificationType = getNotificationType(notification.type);
                  const getIconBgColor = (type) => {
                    const colors = {
                      message: "bg-blue-100",
                      bid: "bg-copper-100",
                      project: "bg-emerald-100",
                      system: "bg-purple-100",
                      awarded: "bg-green-100"
                    };
                    return colors[type] || colors.system;
                  };

                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        "group cursor-pointer rounded-xl border transition-all duration-200 p-3 hover:shadow-md hover:border-copper-200",
                        !notification.read 
                          ? "border-copper-200 bg-gradient-to-br from-copper-50 to-white shadow-sm" 
                          : "border-deep-navy-100 bg-white hover:bg-deep-navy-50"
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex gap-3">
                        {/* Icon Section */}
                        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg shadow-sm", getIconBgColor(notification.type))}>
                          <span>{getNotificationIcon(notification.type)}</span>
                        </div>

                        {/* Content Section */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className={cn("text-sm leading-5", !notification.read ? "font-bold text-deep-navy-900" : "font-semibold text-deep-navy-800")}>
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <div className="mt-1 h-2 w-2 rounded-full bg-copper-500 flex-shrink-0 shadow-sm" />
                            )}
                          </div>

                          {/* Type Badge */}
                          <div className="mb-2">
                            <span className={cn("inline-flex text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border", notificationType.color)}>
                              {notificationType.label}
                            </span>
                          </div>

                          {/* Message */}
                          <p className="text-xs leading-4 text-deep-navy-600 line-clamp-2">
                            {notification.message}
                          </p>

                          {/* Time */}
                          <p className="mt-2 text-[10px] font-medium text-deep-navy-400">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-deep-navy-50 border border-deep-navy-100">
                  <Bell className="h-7 w-7 text-deep-navy-300" />
                </div>
                <p className="text-sm font-semibold text-deep-navy-800">All caught up!</p>
                <p className="mt-2 max-w-[16rem] text-xs leading-5 text-deep-navy-500">
                  Project updates, bids, messages, and announcements will appear here.
                </p>
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
};
