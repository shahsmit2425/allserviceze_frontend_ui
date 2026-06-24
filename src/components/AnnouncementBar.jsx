import { useEffect, useState } from "react";
import axios from "axios";
import { Megaphone, X } from "lucide-react";

import { Button } from "./ui/button";
import { useAuth } from "../context/AuthContext";
import { cn } from "@/lib/utils";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api`;

const priorityStyles = {
  urgent: "border-red-500/30 bg-red-500/14 text-red-100",
  high: "border-orange-400/30 bg-orange-500/14 text-orange-100",
  normal: "border-blue-500/28 bg-blue-500/14 text-blue-100",
  low: "border-border/70 bg-muted/75 text-foreground",
};

const priorityLabels = {
  urgent: "Urgent",
  high: "Priority",
  normal: "Update",
  low: "FYI",
};

export default function AnnouncementBar() {
  const { user, csrfToken } = useAuth();
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    const loadAnnouncements = async () => {
      if (!user) {
        setAnnouncements([]);
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/notifications/announcements`, {
          withCredentials: true,
          headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
        });
        setAnnouncements(response.data?.announcements || []);
      } catch {
        setAnnouncements([]);
      }
    };

    loadAnnouncements();
  }, [csrfToken, user]);

  const handleDismiss = async (announcementId) => {
    try {
      await axios.post(
        `${API_URL}/notifications/announcements/${announcementId}/dismiss`,
        {},
        {
          withCredentials: true,
          headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
        }
      );
      setAnnouncements((prev) => prev.filter((announcement) => announcement.id !== announcementId));
    } catch {
      // Keep the announcement visible if dismiss fails.
    }
  };

  if (!user || announcements.length === 0) {
    return null;
  }

  return (
    <div
      className="relative z-40 px-4 pb-2 sm:px-6 lg:px-8"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto max-w-6xl space-y-2 pt-3">
        {announcements.map((announcement) => (
          <div
            key={announcement.id}
            className={cn(
              "flex items-start justify-between gap-4 rounded-[1.35rem] border px-4 py-4 shadow-lg shadow-slate-900/5 backdrop-blur-xl",
              priorityStyles[announcement.priority] || priorityStyles.normal
            )}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-background/45 shadow-sm">
                <Megaphone className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-current/10 bg-background/35 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]">
                    {priorityLabels[announcement.priority] || priorityLabels.normal}
                  </span>
                  <p className="text-sm font-semibold tracking-[-0.01em]">{announcement.title}</p>
                </div>
                <p className="max-w-4xl text-sm leading-6 opacity-90">{announcement.message}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full bg-background/30 hover:bg-background/45"
              onClick={() => handleDismiss(announcement.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}