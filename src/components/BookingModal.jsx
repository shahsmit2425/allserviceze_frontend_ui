import { useState, useEffect } from "react";
import logger from "@/utils/logger";
import { format, isBefore, startOfDay } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Loader2, Clock, MapPin, CalendarDays, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api`;

// ─── Step labels ──────────────────────────────────────────────────────────────
const STEPS = ["Date", "Time", "Details", "Confirm"];

export default function BookingModal({ open, onClose, service, provider }) {
  const { user, getAuthHeader } = useAuth();

  const [step, setStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedTime, setSelectedTime] = useState(null);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookingCreated, setBookingCreated] = useState(false);

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setStep(0);
      setSelectedDate(null);
      setSlots([]);
      setSelectedTime(null);
      setAddress("");
      setNotes("");
      setBookingCreated(false);
    }
  }, [open]);

  // Fetch slots whenever date changes
  useEffect(() => {
    if (!selectedDate || !provider?.id) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    setSlotsLoading(true);
    axios
      .get(`${API_URL}/providers/${provider.id}/available-slots?date=${dateStr}`)
      .then((res) => setSlots(res.data.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, provider?.id]);

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedTime(null);
    setStep(1);
  };

  const handleMobileDateChange = (event) => {
    if (!event.target.value) return;
    handleDateSelect(new Date(`${event.target.value}T12:00:00`));
  };

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!service || !provider) {
      toast.error("Booking details are missing. Please reopen the modal.");
      return;
    }
    if (!selectedDate || !selectedTime) {
      toast.error("Please select a date and time.");
      return;
    }
    if (!address.trim()) {
      toast.error("Please enter the service address");
      return;
    }
    setSubmitting(true);
    try {
      // Use EST timezone (America/New_York)
      const userTimezone = "America/New_York";
      
      // All bookings are fixed 15-minute time slots
      const durationMinutes = 15;
      await axios.post(
        `${API_URL}/bookings`,
        {
          service_id: service.id,
          provider_id: provider.id,
          scheduled_date: format(selectedDate, "yyyy-MM-dd"),
          scheduled_time: selectedTime,
          duration_minutes: durationMinutes,
          address: address.trim(),
          notes: notes.trim() || null,
          price: service.price,
          timezone: userTimezone,  // EST timezone
        },
        { withCredentials: true, headers: getAuthHeader() }
      );
      setBookingCreated(true);
    } catch (err) {
      logger.error("Booking creation error:", err?.response?.status, err?.response?.data, err?.message);
      const rawDetail = err?.response?.data?.detail;
      let msg;
      if (!rawDetail) {
        msg = err?.message?.includes("Network Error")
          ? "Cannot reach the server. Please check your connection."
          : "Failed to create booking. Please try again.";
      } else if (Array.isArray(rawDetail)) {
        msg = rawDetail.map((d) => d.msg || JSON.stringify(d)).join("; ");
      } else {
        msg = String(rawDetail);
      }
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // After successful booking creation
  if (bookingCreated) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-sm rounded-[1.5rem] border border-border/60 bg-background/95 shadow-[0_24px_64px_-44px_rgba(15,23,42,0.3)]">
          <div className="text-center py-6 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
            <div>
              <h3 className="text-xl font-bold text-foreground">Booking Sent!</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Check your chat for updates. The pro will confirm shortly.
              </p>
            </div>
            <Button className="rounded-lg" onClick={onClose}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const isDateDisabled = (date) => isBefore(date, startOfDay(new Date()));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl overflow-hidden rounded-[1.6rem] border border-border/60 bg-background/95 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.32)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <CalendarDays className="w-5 h-5" />
            Book: {service?.title}
          </DialogTitle>
          <DialogDescription>
            with {provider?.full_name || provider?.business_name}
            {service?.price && (
              <span className="ml-2 font-semibold text-primary">
                ${service.price}
                {service.price_type === "hourly" ? "/hr" : ""}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Progress steps */}
        <div className="mb-2 flex items-center gap-1 overflow-x-auto pb-1">
          {STEPS.map((label, idx) => (
            <div key={label} className="flex items-center flex-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                  ${idx < step ? "bg-primary text-primary-foreground"
                    : idx === step ? "bg-primary/10 text-primary border-2 border-primary"
                    : "bg-muted text-muted-foreground"}`}
              >
                {idx < step ? "✓" : idx + 1}
              </div>
              <span className={`hidden sm:block ml-1 text-xs ${idx === step ? "text-primary font-medium" : "text-muted-foreground"}`}>
                {label}
              </span>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${idx < step ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        {/* ── STEP 0: Pick Date ── */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="sm:hidden">
              <Label htmlFor="mobile-booking-date" className="mb-2 block text-sm font-medium text-foreground">Select a date</Label>
              <Input
                id="mobile-booking-date"
                type="date"
                min={format(new Date(), "yyyy-MM-dd")}
                value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""}
                onChange={handleMobileDateChange}
                className="h-12 rounded-xl border-border/60 bg-muted/30"
              />
            </div>
            <div className="hidden sm:block">
              <p className="mb-3 text-sm text-muted-foreground">Select an available date</p>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={isDateDisabled}
                className="w-full rounded-[1.1rem] border border-border/60 bg-background/80"
              />
            </div>
          </div>
        )}

        {/* ── STEP 1: Pick Time ── */}
        {step === 1 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">
                <CalendarDays className="w-4 h-4 inline mr-1 text-primary" />
                {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : ""}
              </p>
              <Button variant="ghost" size="sm" onClick={() => setStep(0)}>
                Change date
              </Button>
            </div>

            {slotsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : slots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>No available slots on this date.</p>
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => setStep(0)}>
                  Try another date
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    disabled={!slot.available}
                    onClick={() => slot.available && handleTimeSelect(slot.time)}
                    className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition-all
                      ${!slot.available
                        ? "bg-muted text-muted-foreground border-border cursor-not-allowed line-through"
                        : selectedTime === slot.time
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-primary border-primary/20 hover:bg-primary/5 hover:border-primary"
                      }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Address & Notes ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-[1.1rem] border border-primary/15 bg-primary/5 p-3 text-sm">
              <p className="font-medium text-primary">
                <CalendarDays className="w-4 h-4 inline mr-1" />
                {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : ""} at {selectedTime}
              </p>
              <div className="flex gap-2 mt-1">
                <Button variant="ghost" size="sm" className="h-6 text-xs p-1" onClick={() => setStep(0)}>
                  Change date
                </Button>
                <Button variant="ghost" size="sm" className="h-6 text-xs p-1" onClick={() => setStep(1)}>
                  Change time
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="address" className="flex items-center gap-1 mb-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" /> Service Address *
              </Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value.slice(0, 500))}
                maxLength={500}
                placeholder="Enter the address where service is needed"
                className="rounded-xl border-border/60 bg-muted/30 focus-visible:ring-primary"
              />
            </div>

            <div>
              <Label htmlFor="notes" className="mb-1.5 block">
                Notes <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
                maxLength={1000}
                placeholder="Any details the pro should know..."
                rows={3}
                className="resize-none rounded-xl border-border/60 bg-muted/30 focus-visible:ring-primary"
              />
            </div>

            <Button
              className="w-full rounded-lg"
              onClick={() => setStep(3)}
              disabled={!address.trim()}
            >
              Review Booking
            </Button>
          </div>
        )}

        {/* ── STEP 3: Confirmation summary OR success ── */}
        {step === 3 && !submitting && (
          <div>
            {/* After successful submit — step stays 3 but booking was created */}
            <div className="space-y-3">
              <div className="rounded-[1.1rem] border border-primary/15 bg-primary/5 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-medium">{service?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pro</span>
                  <span className="font-medium">{provider?.full_name || provider?.business_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{selectedDate && format(selectedDate, "MMMM d, yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium">{selectedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Address</span>
                  <span className="font-medium text-right max-w-[60%]">{address}</span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-1">
                  <span className="font-semibold">Price</span>
                  <span className="font-bold text-primary">
                    ${service?.price}
                    {service?.price_type === "hourly" ? "/hr" : ""}
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Your request will be sent to the pro for approval.
                You'll be notified in chat once confirmed.
              </p>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-lg border-border/60 bg-background/80" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button
                  className="flex-1 rounded-lg"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                  ) : (
                    "Confirm Booking"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}

// ─── Success screen (shown after successful booking) ──────────────────────────
export function BookingSuccess({ onClose }) {
  return (
    <div className="text-center py-6 space-y-4">
      <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
      <div>
        <h3 className="text-xl font-bold text-foreground">Booking Sent!</h3>
        <p className="text-muted-foreground text-sm mt-1">
          Check your chat for updates. The pro will confirm shortly.
        </p>
      </div>
      <Button className="rounded-lg" onClick={onClose}>
        Done
      </Button>
    </div>
  );
}
