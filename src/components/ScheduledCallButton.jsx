/**
 * ScheduledCallButton
 *
 * Shows Audio / Video call buttons that open a Daily.co private call room.
 * Users can join calls anytime after booking is confirmed.
 */
import { useState, useEffect, useCallback } from "react";
import { Phone, Video } from "lucide-react";
import { Button } from "./ui/button";
import DailyCallModal from "./DailyCallModal";
import { useAuth } from "../context/AuthContext";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api`;

function getCallState(booking) {
  if (!booking || booking.status === "none") {
    return { state: "hidden", message: "" };
  }

  if (booking.status === "confirmed") {
    return {
      state: "live",
      message: "Ready to call",
      canAudio: true,
      canVideo: true,
    };
  }

  if (booking.status === "pending") return { state: "locked", message: "Waiting for pro to confirm" };
  if (booking.status === "cancelled") return { state: "locked", message: "This booking was cancelled" };
  if (booking.status === "completed") return { state: "locked", message: "Appointment has ended" };

  return { state: "locked", message: "" };
}

export default function ScheduledCallButton({ booking, viewAs, subscriptionTier: _subscriptionTier = "free" }) {
  const { user } = useAuth();
  const [callState, setCallState] = useState(() => getCallState(booking));
  const [activeCall, setActiveCall] = useState(null);
  const [presenceCount, setPresenceCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setCallState(getCallState(booking)), 30_000);
    return () => clearInterval(id);
  }, [booking]);

  useEffect(() => {
    setCallState(getCallState(booking));
  }, [booking]);

  const fetchStatus = useCallback(async () => {
    if (!booking?.id) return;
    try {
      const res = await fetch(`${API_URL}/bookings/${booking.id}/call-room/status`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setPresenceCount(data.participant_count || 0);
      } else {
        setPresenceCount(0);
      }
    } catch {
      setPresenceCount(0);
    }
  }, [booking?.id]);

  useEffect(() => {
    if (!booking?.id) return;
    fetchStatus();
    const intervalId = setInterval(fetchStatus, 5000);
    return () => clearInterval(intervalId);
  }, [booking?.id, fetchStatus]);

  if (callState.state === "hidden") return null;

  const isLive = callState.state === "live";
  const audioReady = isLive && callState.canAudio;
  const videoReady = isLive && callState.canVideo;
  const otherPartyLabel = viewAs === "provider" ? "customer" : "provider";
  const currentUserId = user?.id || user?.user_id;
  const isProvider = currentUserId && booking?.provider_id && String(currentUserId) === String(booking.provider_id);
  const otherPartyName = isProvider ? booking?.customer_name : booking?.provider_name;

  const handleEndCall = useCallback(() => {
    setPresenceCount(0);
    setActiveCall(null);
    setTimeout(fetchStatus, 600);
  }, [fetchStatus]);

  return (
    <>
      <div className="info-tile space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="detail-kicker">Call room</p>
            <p className="mt-2 text-sm leading-6 text-foreground/85">
              {isLive
                ? `The ${otherPartyLabel} can join from this booking card now.`
                : "Calls stay locked here until the appointment is confirmed."}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 self-start rounded-full border px-3 py-1.5 text-xs font-semibold ${
              isLive
                ? "border-emerald-400/25 bg-emerald-500/12 text-emerald-100"
                : "border-border/70 bg-muted/70 text-muted-foreground"
            }`}
          >
            {callState.message}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold ${
              audioReady ? "bg-emerald-500/14 text-emerald-100" : "bg-muted/70 text-muted-foreground"
            }`}
          >
            <Phone className="h-3.5 w-3.5" />
            {audioReady ? "Audio ready" : "Audio locked"}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold ${
              videoReady ? "bg-sky-500/14 text-sky-100" : "bg-muted/70 text-muted-foreground"
            }`}
          >
            <Video className="h-3.5 w-3.5" />
            {videoReady ? "Video ready" : "Video locked"}
          </span>
          {presenceCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-background/80 px-3 py-2 text-xs font-semibold text-emerald-100 shadow-sm shadow-slate-900/5">
              Room active • {presenceCount}
            </span>
          )}
        </div>

        <div>
          <Button
            type="button"
            disabled={!isLive}
            onClick={() => isLive && setActiveCall("video")}
            className={`w-full rounded-full justify-between ${
              !isLive ? "pointer-events-none bg-muted text-muted-foreground hover:bg-muted" : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <Video className="h-4 w-4" />
              Join Call
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.18em]">
              {isLive ? "Live room" : "Locked"}
            </span>
          </Button>
        </div>
      </div>

      {activeCall && (
        <DailyCallModal
          booking={booking}
          callType={activeCall}
          otherPartyName={otherPartyName}
          onClose={handleEndCall}
        />
      )}
    </>
  );
}
