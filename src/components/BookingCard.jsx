import { useState } from "react";
import logger from "@/utils/logger";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import ScheduledCallButton from "./ScheduledCallButton";
import {
  CalendarDays, Clock, MapPin, Phone, Video,
  CheckCircle, XCircle, Loader2
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api`;

const STATUS_CONFIG = {
  pending:   { label: "Pending",   color: "border-amber-600/30 bg-amber-500/14 text-amber-100" },
  confirmed: { label: "Confirmed", color: "border-blue-500/28 bg-blue-500/14 text-blue-100" },
  completed: { label: "Completed", color: "border-emerald-500/28 bg-emerald-500/14 text-emerald-100" },
  cancelled: { label: "Cancelled", color: "border-rose-500/28 bg-rose-500/14 text-rose-100" },
};

/**
 * BookingCard — works for BOTH provider and customer views.
 * Props:
 *   booking       — booking object from API
 *   viewAs        — "provider" | "customer"
 *   subscriptionTier — provider's tier (for video gating)
 *   onUpdate      — callback after status change
 */
export default function BookingCard({ booking, viewAs, subscriptionTier = "free", onUpdate }) {
  const { getAuthHeader } = useAuth();
  const [allowAudio, setAllowAudio]       = useState(true);
  const [allowVideo, setAllowVideo]       = useState(false);
  const [showDecline, setShowDecline]     = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [loading, setLoading]             = useState(null); // "confirm"|"cancel"|"complete"

  const canOfferVideo = ["pro", "enterprise"].includes(subscriptionTier);

  // Use timezone-aware time if available, fallback to basic format
  const scheduledLabel = viewAs === "customer" 
    ? (booking.scheduled_at_customer || `${booking.scheduled_date} at ${booking.scheduled_time || ""}`)
    : (booking.scheduled_at_provider || `${booking.scheduled_date} at ${booking.scheduled_time || ""}`);

  const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;

  const doAction = async (action, extra = {}) => {
    setLoading(action);
    try {
      await axios.patch(
        `${API_URL}/bookings/${booking.id}`,
        { action, ...extra },
        { withCredentials: true, headers: getAuthHeader() }
      );
      toast.success(
        action === "confirm"   ? "Booking confirmed ✅"
        : action === "cancel"  ? "Booking cancelled"
        : "Marked as complete ✅"
      );
      onUpdate?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Action failed");
    } finally {
      setLoading(null);
      setShowDecline(false);
    }
  };

  const otherPartyName = viewAs === "provider"
    ? booking.customer_name  || "Customer"
    : booking.provider_name  || "Pro";
  const otherPartyAvatar = viewAs === "provider"
    ? booking.customer_avatar
    : booking.provider_avatar;

  return (
    <Card className="result-card-surface border-0">
      <CardContent className="p-5 sm:p-6">
        <div className="booking-card-grid">
          <div className="booking-card-header">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar className="h-12 w-12 border border-border/70 shadow-sm">
                <AvatarImage src={otherPartyAvatar} />
                <AvatarFallback className="bg-[#1B4332]/10 text-[#1B4332] font-semibold">
                  {otherPartyName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="caption">{viewAs === "provider" ? "Customer booking" : "Provider booking"}</p>
                <p className="mt-2 truncate text-lg font-semibold tracking-[-0.03em] text-foreground">{otherPartyName}</p>
                <p className="mt-1 truncate text-sm text-muted-foreground">{booking.service_title}</p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <Badge className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusCfg.color}`}>
                {statusCfg.label}
              </Badge>
              <span className="text-xs font-medium text-muted-foreground">
                {viewAs === "provider" ? "Manage appointment" : "Appointment status"}
              </span>
            </div>
          </div>

          <div className="booking-card-meta-grid">
            <div className="info-tile sm:col-span-2 xl:col-span-2">
              <p className="detail-kicker">Scheduled</p>
              <div className="mt-2 flex items-start gap-2 text-foreground">
                <CalendarDays className="mt-0.5 h-4 w-4 text-primary" />
                <p className="text-sm font-semibold leading-6">{scheduledLabel}</p>
              </div>
            </div>
            <div className="info-tile">
              <p className="detail-kicker">Duration</p>
              <div className="mt-2 flex items-center gap-2 text-foreground">
                <Clock className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">{booking.duration_minutes || 60} min</p>
              </div>
            </div>
            <div className="info-tile">
              <p className="detail-kicker">Price</p>
              <p className="mt-2 text-lg font-semibold text-foreground">${booking.price}</p>
            </div>
            <div className="info-tile sm:col-span-2 xl:col-span-4">
              <p className="detail-kicker">Address</p>
              <div className="mt-2 flex items-start gap-2 text-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-sm font-semibold leading-6 break-words">{booking.address}</p>
              </div>
            </div>
          </div>

          {booking.notes && (
            <div className="info-tile border-amber-100 bg-amber-50/90">
              <p className="detail-kicker text-amber-800">Notes</p>
              <p className="mt-2 text-sm italic leading-6 text-amber-900">"{booking.notes}"</p>
            </div>
          )}

          {/* ── PROVIDER — confirm or decline pending ── */}
          {viewAs === "provider" && booking.status === "pending" && (
            <div className="space-y-4 rounded-[1.4rem] border border-border/70 bg-background/65 p-4">
              <div>
                <p className="detail-kicker">Appointment permissions</p>
                <p className="mt-1 text-sm leading-6 text-foreground/85">Choose which call options the customer can use for this appointment before you confirm it.</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4 rounded-[1rem] border border-border/70 bg-background/70 p-3 shadow-sm shadow-slate-950/10">
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-300" />
                      Allow Audio Call
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">Customer can audio call during appointment</p>
                  </div>
                  <Switch
                    checked={allowAudio}
                    onCheckedChange={setAllowAudio}
                    className="data-[state=checked]:bg-[#1B4332]"
                  />
                </div>

                <div className={`flex items-center justify-between gap-4 rounded-[1rem] border border-border/70 bg-background/70 p-3 shadow-sm shadow-slate-950/10 ${!canOfferVideo ? "opacity-40" : ""}`}>
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-sky-300" />
                      Allow Video Call
                      {!canOfferVideo && (
                        <span className="ml-1 text-xs font-normal text-amber-400">(Pro plan)</span>
                      )}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">Customer can video call during appointment</p>
                  </div>
                  <Switch
                    checked={allowVideo && canOfferVideo}
                    onCheckedChange={(v) => canOfferVideo && setAllowVideo(v)}
                    disabled={!canOfferVideo}
                    className="data-[state=checked]:bg-[#1B4332]"
                  />
                </div>
              </div>

              {!showDecline ? (
                <div className="booking-card-actions">
                  <Button
                    className="flex-1 rounded-full"
                    onClick={() => doAction("confirm", {
                      pro_allows_audio: allowAudio,
                      pro_allows_video: allowVideo && canOfferVideo,
                    })}
                    disabled={!!loading}
                  >
                    {loading === "confirm" ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                      <><CheckCircle className="w-4 h-4 mr-1.5" /> Confirm</>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-full border-rose-500/25 text-rose-200 hover:bg-rose-500/10"
                    onClick={() => setShowDecline(true)}
                    disabled={!!loading}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" /> Decline
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Textarea
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    placeholder="Reason for declining (optional, sent to customer)..."
                    rows={2}
                    className="text-sm resize-none focus-visible:ring-red-400"
                  />
                  <div className="booking-card-actions">
                    <Button
                      variant="destructive"
                      className="flex-1 rounded-full"
                      onClick={() => doAction("cancel", { cancel_reason: declineReason })}
                      disabled={!!loading}
                    >
                      {loading === "cancel" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirm Decline"}
                    </Button>
                    <Button
                      variant="ghost"
                      className="flex-1 rounded-full"
                      onClick={() => setShowDecline(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PROVIDER — mark complete (for confirmed bookings) ── */}
          {viewAs === "provider" && booking.status === "confirmed" && (
            <div className="booking-card-actions border-t border-border/70 pt-4">
              <Button
                className="flex-1 rounded-full"
                onClick={() => doAction("complete")}
                disabled={!!loading}
              >
                {loading === "complete" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <><CheckCircle className="w-4 h-4 mr-1.5" /> Mark Complete</>
                )}
              </Button>
              <Button
                variant="outline"
                className="rounded-full border-rose-500/25 text-rose-200 hover:bg-rose-500/10"
                onClick={() => doAction("cancel")}
                disabled={!!loading}
              >
                Cancel
              </Button>
            </div>
          )}

          {/* ── CUSTOMER — cancel pending or confirmed ── */}
          {viewAs === "customer" && (booking.status === "pending" || booking.status === "confirmed") && (
            <div className="booking-card-actions border-t border-border/70 pt-4">
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-full border-rose-500/25 text-rose-200 hover:bg-rose-500/10"
                onClick={() => doAction("cancel")}
                disabled={!!loading}
              >
                {loading === "cancel" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Cancel Booking"}
              </Button>
            </div>
          )}

          {/* ── Call permissions info (customer sees what pro allowed) ── */}
          {viewAs === "customer" && booking.status === "confirmed" && (
            <div className="info-tile border-border/70 bg-background/65">
              <p className="detail-kicker">Call permissions</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold ${booking.pro_allows_audio ? "bg-emerald-500/14 text-emerald-100" : "bg-muted/70 text-muted-foreground"}`}>
                  <Phone className="w-3 h-3" />
                  {booking.pro_allows_audio ? "Audio enabled" : "No audio"}
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold ${booking.pro_allows_video ? "bg-sky-500/14 text-sky-100" : "bg-muted/70 text-muted-foreground"}`}>
                  <Video className="w-3 h-3" />
                  {booking.pro_allows_video ? "Video enabled" : "No video"}
                </span>
              </div>
            </div>
          )}

          {(booking.status === "confirmed" || booking.status === "pending") && (
            <ScheduledCallButton
              booking={booking}
              viewAs={viewAs}
              subscriptionTier={subscriptionTier}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
