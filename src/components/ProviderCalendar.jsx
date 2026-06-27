import { useState, useEffect, useCallback } from "react";
import logger from "@/utils/logger";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import {
  format,
  parseISO,
  isSameDay,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
} from "date-fns";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import axios from "axios";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import {
  CalendarDays,
  Clock,
  Ban,
  ChevronLeft,
  ChevronRight,
  Save,
  Plus,
  Trash2,
  Loader2,
  User,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api`;

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_STYLES = {
  pending:   { bg: "border border-amber-600/30 bg-amber-500/14 text-amber-100", dot: "bg-amber-400" },
  confirmed: { bg: "border border-blue-500/28 bg-blue-500/14 text-blue-100",   dot: "bg-blue-300"   },
  completed: { bg: "border border-emerald-500/25 bg-emerald-500/12 text-emerald-100",   dot: "bg-emerald-300"   },
  cancelled: { bg: "border border-rose-500/28 bg-rose-500/14 text-rose-100",     dot: "bg-rose-300"    },
};

const BLOCK_REASONS = ["Vacation", "Holiday", "Personal", "Training", "Fully booked", "Unavailable"];

// ─────────────────────────────────────────────────────────────────────────────
export default function ProviderCalendar({ providerId }) {
  const { user, getAuthHeader } = useAuth();
  const [tab, setTab] = useState("calendar");

  // ── Calendar state ────────────────────────────────────────────────────────
  const [viewMonth, setViewMonth]     = useState(new Date());
  const [calData, setCalData]         = useState({ bookings: [], blocked_dates: [] });
  const [calLoading, setCalLoading]   = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  // ── Availability state (24/7 by default) ──────────────────────────────────
  const [avail, setAvail]             = useState(() =>
    Array.from({ length: 7 }, (_, i) => ({
      day_of_week: i,
      start_time: "00:00",
      end_time: "23:45",
      is_available: true,  // All days available
    }))
  );
  const [availLoading, setAvailLoading] = useState(false);
  const [availSaving, setAvailSaving]   = useState(false);

  // ── Block date modal ──────────────────────────────────────────────────────
  const [blockModal, setBlockModal]   = useState(false);
  const [blockForm, setBlockForm]     = useState({
    type: "single",       // "single" | "range"
    date: "",
    startDate: "",
    endDate: "",
    reason: "",
    isFullDay: true,      // only relevant for type="single"
    startTime: "09:00",
    endTime: "17:00",
  });
  const [blockSaving, setBlockSaving] = useState(false);

  // ─── Fetch calendar data ──────────────────────────────────────────────────
  const fetchCalendar = useCallback(async (month) => {
    setCalLoading(true);
    const monthStr = format(month, "yyyy-MM");
    try {
      const res = await axios.get(`${API_URL}/providers/${providerId}/calendar`, {
        params: { month: monthStr },
        withCredentials: true,
        headers: getAuthHeader(),
      });
      setCalData(res.data);
    } catch {
      // silently fail — calendar is non-critical
    } finally {
      setCalLoading(false);
    }
  }, [providerId, getAuthHeader]);

  // ─── Fetch weekly availability ────────────────────────────────────────────
  const fetchAvailability = useCallback(async () => {
    setAvailLoading(true);
    try {
      const res = await axios.get(
        `${API_URL}/providers/${providerId}/availability/weekly`,
        { withCredentials: true, headers: getAuthHeader() }
      );
      if (res.data?.length === 7) setAvail(res.data);
    } catch { /* silent */ }
    finally { setAvailLoading(false); }
  }, [providerId, getAuthHeader]);

  useEffect(() => {
    fetchCalendar(viewMonth);
  }, [viewMonth, fetchCalendar]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // ─── Save availability ────────────────────────────────────────────────────
  const saveAvailability = async () => {
    setAvailSaving(true);
    try {
      await axios.put(
        `${API_URL}/providers/${providerId}/availability/weekly`,
        { slots: avail },
        { withCredentials: true, headers: getAuthHeader() }
      );
      toast.success("Working hours saved!");
    } catch {
      toast.error("Failed to save working hours");
    } finally {
      setAvailSaving(false);
    }
  };

  // ─── Block date(s) ────────────────────────────────────────────────────────
  const handleBlockSubmit = async () => {
    if (blockForm.type === "single" && !blockForm.date) {
      toast.error("Please select a date");
      return;
    }
    if (blockForm.type === "range" && (!blockForm.startDate || !blockForm.endDate)) {
      toast.error("Please select start and end dates");
      return;
    }
    setBlockSaving(true);
    try {
      if (blockForm.type === "range") {
        await axios.post(
          `${API_URL}/providers/${providerId}/blocked-dates/range`,
          {
            start_date: blockForm.startDate,
            end_date: blockForm.endDate,
            reason: blockForm.reason || "Unavailable",
          },
          { withCredentials: true, headers: getAuthHeader() }
        );
        toast.success("Date range blocked");
      } else {
        if (!blockForm.isFullDay && (!blockForm.startTime || !blockForm.endTime)) {
          toast.error("Please set start and end times");
          setBlockSaving(false);
          return;
        }
        if (!blockForm.isFullDay && blockForm.startTime >= blockForm.endTime) {
          toast.error("End time must be after start time");
          setBlockSaving(false);
          return;
        }
        await axios.post(
          `${API_URL}/providers/${providerId}/blocked-dates`,
          {
            date: blockForm.date,
            reason: blockForm.reason || "Blocked",
            is_full_day: blockForm.isFullDay,
            start_time: blockForm.isFullDay ? undefined : blockForm.startTime,
            end_time:   blockForm.isFullDay ? undefined : blockForm.endTime,
          },
          { withCredentials: true, headers: getAuthHeader() }
        );
        toast.success(blockForm.isFullDay ? "Full day blocked" : `${blockForm.startTime}–${blockForm.endTime} blocked`);
      }
      setBlockModal(false);
      setBlockForm({ type: "single", date: "", startDate: "", endDate: "", reason: "", isFullDay: true, startTime: "09:00", endTime: "17:00" });
      fetchCalendar(viewMonth);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to block date");
    } finally {
      setBlockSaving(false);
    }
  };

  // ─── Unblock date ─────────────────────────────────────────────────────────
  const handleUnblock = async (blockedId, dateStr) => {
    if (!confirm(`Unblock ${dateStr}?`)) return;
    try {
      await axios.delete(
        `${API_URL}/providers/${providerId}/blocked-dates/${blockedId}`,
        { withCredentials: true, headers: getAuthHeader() }
      );
      toast.success("Date unblocked");
      fetchCalendar(viewMonth);
      setSelectedDay(null);
    } catch {
      toast.error("Failed to unblock date");
    }
  };

  // ─── Derived per-day data ─────────────────────────────────────────────────
  const fullDayBlockedDates = calData.blocked_dates
    .filter((b) => b.is_full_day !== false)
    .map((b) => parseISO(b.date));
  const partialBlockedDates = calData.blocked_dates
    .filter((b) => b.is_full_day === false)
    .map((b) => parseISO(b.date));
  // legacy alias so the rest of the file still works
  const blockedDates = [...fullDayBlockedDates, ...partialBlockedDates];
  const bookedDates  = calData.bookings.map((b) => parseISO(b.date));

  const getDayBookings = (day) =>
    calData.bookings.filter((b) => isSameDay(parseISO(b.date), day));
  const getDayBlocked  = (day) =>
    calData.blocked_dates.find((b) => isSameDay(parseISO(b.date), day));
  const getDayAllBlocks = (day) =>
    calData.blocked_dates.filter((b) => isSameDay(parseISO(b.date), day));

  // ─── Preset helpers ───────────────────────────────────────────────────────
  const applyPreset = (preset) => {
    const presets = {
      "mon-fri": { days: [0,1,2,3,4], start: "09:00", end: "17:00" },
      "mon-sat": { days: [0,1,2,3,4,5], start: "08:00", end: "18:00" },
      weekends:  { days: [5,6], start: "10:00", end: "16:00" },
      all:       { days: [0,1,2,3,4,5,6], start: "09:00", end: "17:00" },
    };
    const p = presets[preset];
    if (!p) return;
    setAvail(avail.map((s, i) => ({
      ...s,
      is_available: p.days.includes(i),
      start_time:   p.days.includes(i) ? p.start : s.start_time,
      end_time:     p.days.includes(i) ? p.end   : s.end_time,
    })));
  };

  // ─── Selected day panel data ──────────────────────────────────────────────
  const selectedDayBookings = selectedDay ? getDayBookings(selectedDay) : [];
  const selectedDayBlocked  = selectedDay ? getDayBlocked(selectedDay)  : null;
  const selectedDayBlocks   = selectedDay ? getDayAllBlocks(selectedDay) : [];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Card className="border-0 shadow-card">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            My Calendar
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="border-rose-500/25 text-rose-200 hover:bg-rose-500/10"
            onClick={() => setBlockModal(true)}
          >
            <Ban className="w-4 h-4 mr-1" />
            Block Date
          </Button>
        </div>

        {/* Tabs */}
        <div className="-mx-6 mt-4 flex border-b border-border/70 px-6">
          {[
            { key: "calendar",     icon: CalendarDays, label: "Calendar" },
            { key: "hours",        icon: Clock,        label: "Working Hours" },
            { key: "blocked-list", icon: Ban,          label: "Blocked Dates" },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-6">

        {/* ═══════════════ TAB: CALENDAR ══════════════════════════════════ */}
        {tab === "calendar" && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Day Picker */}
            <div className="flex-1">
              {/* Month nav */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                  className="p-1.5 rounded hover:bg-muted transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="font-semibold text-base">
                  {format(viewMonth, "MMMM yyyy")}
                  {calLoading && <Loader2 className="w-4 h-4 animate-spin inline ml-2 text-muted-foreground" />}
                </span>
                <button
                  onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                  className="p-1.5 rounded hover:bg-muted transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <DayPicker
                month={viewMonth}
                onMonthChange={setViewMonth}
                onDayClick={(day) => setSelectedDay(isSameDay(day, selectedDay) ? null : day)}
                selected={selectedDay || undefined}
                modifiers={{
                  blocked:        fullDayBlockedDates,
                  partialBlocked: partialBlockedDates,
                  booked:         bookedDates,
                }}
                modifiersClassNames={{
                  blocked:        "rdp-day--blocked",
                  partialBlocked: "rdp-day--partial-blocked",
                  booked:         "rdp-day--booked",
                  selected:       "rdp-day--selected",
                }}
                components={{
                  DayContent: ({ date }) => {
                    const dayBookings = getDayBookings(date);
                    const dayBlockInfo = getDayBlocked(date);
                    const isFullBlocked    = dayBlockInfo && dayBlockInfo.is_full_day !== false;
                    const isPartialBlocked = dayBlockInfo && dayBlockInfo.is_full_day === false;
                    return (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <span>{date.getDate()}</span>
                        {/* Dot indicators */}
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                          {isFullBlocked && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          )}
                          {isPartialBlocked && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                          )}
                          {dayBookings.slice(0, 2).map((_, i) => (
                            <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary" />
                          ))}
                          {dayBookings.length > 2 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                          )}
                        </div>
                      </div>
                    );
                  },
                }}
                classNames={{
                  months: "flex flex-col",
                  month: "w-full",
                  table: "w-full border-collapse",
                  head_cell: "text-muted-foreground font-normal text-xs pb-2 text-center w-10",
                  cell: "text-center p-0",
                  day: "h-10 w-10 mx-auto rounded-lg text-sm font-normal hover:bg-muted cursor-pointer transition-colors",
                  day_today: "font-bold text-primary",
                  day_outside: "text-muted-foreground opacity-40",
                  nav: "hidden",   // we use our own nav buttons above
                }}
              />

              {/* Legend */}
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground justify-center flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary inline-block" /> Booking
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Full-day block
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-600 inline-block" /> Partial block
                </span>
                <span className="flex items-center gap-1 cursor-pointer text-primary" onClick={() => setBlockModal(true)}>
                  <Plus className="w-3 h-3" /> Block a date
                </span>
              </div>
            </div>

            {/* Day Detail Panel */}
            <div className="lg:w-72 xl:w-80">
              {selectedDay ? (
                <div className="bg-muted/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">
                      {format(selectedDay, "EEEE, MMM d")}
                    </h3>
                    <button
                      onClick={() => setSelectedDay(null)}
                      className="text-muted-foreground hover:text-foreground text-lg leading-none"
                    >×</button>
                  </div>

                  {/* Blocked banner(s) */}
                  {selectedDayBlocks.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {selectedDayBlocks.map((blk) => (
                        <div
                          key={blk.id}
                          className={`flex items-start justify-between rounded-lg p-3 border ${
                            blk.is_full_day !== false
                              ? "border-rose-500/28 bg-rose-500/12"
                              : "border-amber-600/28 bg-amber-500/12"
                          }`}
                        >
                          <div>
                            <p className={`font-medium text-sm flex items-center gap-1.5 ${
                              blk.is_full_day !== false ? "text-rose-200" : "text-amber-100"
                            }`}>
                              <Ban className="w-4 h-4" />
                              {blk.is_full_day !== false
                                ? "Full day blocked"
                                : `${blk.start_time}–${blk.end_time} blocked`
                              }
                            </p>
                            {blk.reason && blk.reason !== "Blocked" && (
                              <p className="text-xs text-muted-foreground mt-0.5">{blk.reason}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleUnblock(blk.id, format(selectedDay, "MMM d"))}
                            className="ml-2 shrink-0 text-xs font-medium text-rose-300 underline hover:text-rose-100"
                          >
                            Unblock
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bookings */}
                  {selectedDayBookings.length > 0 ? (
                    <div className="space-y-2">
                      {selectedDayBookings.map((b) => (
                        <div key={b.id} className="rounded-lg border border-border/70 bg-background/70 p-3 shadow-sm shadow-slate-950/10">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium leading-tight">{b.service_title}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <User className="w-3 h-3" /> {b.customer_name}
                              </p>
                            </div>
                            <Badge className={`text-xs shrink-0 ${STATUS_STYLES[b.status]?.bg}`}>
                              {b.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {b.time} • {b.duration_minutes} min
                          </div>
                          <div className="flex gap-2 mt-2">
                            {b.allows_audio && (
                              <span className="rounded px-2 py-0.5 text-xs text-emerald-100 bg-emerald-500/14">
                                🎙 Audio
                              </span>
                            )}
                            {b.allows_video && (
                              <span className="rounded px-2 py-0.5 text-xs text-sky-100 bg-sky-500/14">
                                📹 Video
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : selectedDayBlocks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No bookings this day</p>
                      <button
                        className="mt-2 text-xs text-rose-300 underline hover:text-rose-100"
                        onClick={() => {
                          setBlockForm((f) => ({
                            ...f,
                            date: format(selectedDay, "yyyy-MM-dd"),
                            type: "single",
                          }));
                          setBlockModal(true);
                        }}
                      >
                        Block this date
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="bg-muted/20 rounded-xl p-6 text-center text-muted-foreground h-full flex flex-col items-center justify-center gap-2">
                  <CalendarDays className="w-10 h-10 opacity-30" />
                  <p className="text-sm">Click a date to see bookings</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════ TAB: WORKING HOURS ════════════════════════════ */}
        {tab === "hours" && (
          <div className="max-w-xl">
            <p className="text-sm text-muted-foreground mb-1">
              Set your recurring weekly schedule. Customers can only book during these hours.
            </p>

            {/* Quick presets */}
            <div className="flex flex-wrap gap-2 mb-5">
              <span className="text-xs text-muted-foreground self-center mr-1">Quick set:</span>
              {[
                { key: "mon-fri", label: "Mon–Fri 9–5" },
                { key: "mon-sat", label: "Mon–Sat 8–6" },
                { key: "weekends", label: "Weekends" },
                { key: "all", label: "Every Day" },
              ].map((p) => (
                <button
                  key={p.key}
                  onClick={() => applyPreset(p.key)}
                  className="px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {availLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-1 bg-muted/30 rounded-xl p-4 mb-5">
                {avail.map((slot, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
                    {/* Day name */}
                    <span className="w-12 text-sm font-medium text-foreground shrink-0">
                      {DAY_SHORT[i]}
                    </span>

                    {/* Toggle */}
                    <button
                      onClick={() => {
                        const copy = [...avail];
                        copy[i] = { ...copy[i], is_available: !copy[i].is_available };
                        setAvail(copy);
                      }}
                      className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${
                        slot.is_available ? "bg-primary" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                          slot.is_available ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>

                    {slot.is_available ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="time"
                          value={slot.start_time}
                          onChange={(e) => {
                            const copy = [...avail];
                            copy[i] = { ...copy[i], start_time: e.target.value };
                            setAvail(copy);
                          }}
                          className="border border-border rounded-md px-2 py-1 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                        />
                        <span className="text-muted-foreground text-sm">–</span>
                        <input
                          type="time"
                          value={slot.end_time}
                          onChange={(e) => {
                            const copy = [...avail];
                            copy[i] = { ...copy[i], end_time: e.target.value };
                            setAvail(copy);
                          }}
                          className="border border-border rounded-md px-2 py-1 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Unavailable</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={saveAvailability}
              disabled={availSaving}
              className="w-full"
            >
              {availSaving
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</>
                : <><Save className="w-4 h-4 mr-2" /> Save Working Hours</>
              }
            </Button>
          </div>
        )}

        {/* ═══════════════ TAB: BLOCKED DATES LIST ════════════════════════ */}
        {tab === "blocked-list" && (
          <div className="max-w-xl">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {calData.blocked_dates.length} date{calData.blocked_dates.length !== 1 ? "s" : ""} blocked
                {" "}in {format(viewMonth, "MMMM yyyy")}
              </p>
              <Button size="sm" onClick={() => setBlockModal(true)}>
                <Plus className="w-4 h-4 mr-1" /> Block Date
              </Button>
            </div>

            {calData.blocked_dates.length === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-xl">
                <Ban className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium">No dates blocked</p>
                <p className="text-xs text-muted-foreground mt-1">Block dates for vacations, holidays, or personal time</p>
                <Button size="sm" className="mt-4" variant="outline" onClick={() => setBlockModal(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Block a Date
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {[...calData.blocked_dates]
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((b) => (
                    <div
                      key={b.id}
                      className={`flex items-center justify-between p-3 border rounded-lg ${
                        b.is_full_day !== false
                          ? "border-rose-500/28 bg-rose-500/12"
                          : "border-amber-600/28 bg-amber-500/12"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {format(parseISO(b.date + "T12:00:00"), "EEEE, MMM d, yyyy")}
                          {b.is_full_day === false && b.start_time && b.end_time && (
                            <span className="ml-2 text-xs font-normal text-amber-100">
                              {b.start_time}–{b.end_time}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {b.is_full_day === false ? "Partial block" : "Full day"}
                          {b.reason && b.reason !== "Blocked" ? ` · ${b.reason}` : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => handleUnblock(b.id, format(parseISO(b.date + "T12:00:00"), "MMM d"))}
                        className="ml-3 rounded p-1.5 text-rose-300 transition-colors hover:bg-rose-500/12 hover:text-rose-100"
                        title="Unblock"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* ═══════════════ BLOCK DATE MODAL ══════════════════════════════════ */}
      <Dialog open={blockModal} onOpenChange={setBlockModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-rose-400" /> Block Date
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Single vs Range toggle */}
            <div className="grid grid-cols-2 gap-2">
              {["single", "range"].map((t) => (
                <button
                  key={t}
                  onClick={() => setBlockForm((f) => ({ ...f, type: t }))}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    blockForm.type === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t === "single" ? "Single Day" : "Date Range"}
                </button>
              ))}
            </div>

            {blockForm.type === "single" ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1.5">Date *</label>
                  <input
                    type="date"
                    value={blockForm.date}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setBlockForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                  />
                </div>

                {/* Full-day vs time-range toggle */}
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Block full day</p>
                    <p className="text-xs text-muted-foreground">Leave off to block specific hours</p>
                  </div>
                  <button
                    onClick={() => setBlockForm((f) => ({ ...f, isFullDay: !f.isFullDay }))}
                    className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${
                      blockForm.isFullDay ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      blockForm.isFullDay ? "translate-x-5" : "translate-x-0"
                    }`} />
                  </button>
                </div>

                {/* Time pickers — only when not full day */}
                {!blockForm.isFullDay && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-foreground block mb-1.5">From time *</label>
                      <input
                        type="time"
                        value={blockForm.startTime}
                        onChange={(e) => setBlockForm((f) => ({ ...f, startTime: e.target.value }))}
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground block mb-1.5">To time *</label>
                      <input
                        type="time"
                        value={blockForm.endTime}
                        onChange={(e) => setBlockForm((f) => ({ ...f, endTime: e.target.value }))}
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1.5">From *</label>
                  <input
                    type="date"
                    value={blockForm.startDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setBlockForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1.5">To *</label>
                  <input
                    type="date"
                    value={blockForm.endDate}
                    min={blockForm.startDate || new Date().toISOString().split("T")[0]}
                    onChange={(e) => setBlockForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                  />
                </div>
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">Reason</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {BLOCK_REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setBlockForm((f) => ({ ...f, reason: r }))}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      blockForm.reason === r
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Or type custom reason..."
                value={BLOCK_REASONS.includes(blockForm.reason) ? "" : blockForm.reason}
                onChange={(e) => setBlockForm((f) => ({ ...f, reason: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
              />
            </div>

            {/* Info */}
            {blockForm.type === "range" && blockForm.startDate && blockForm.endDate && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                This will block all days from {blockForm.startDate} to {blockForm.endDate} (up to 90 days).
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockModal(false)} disabled={blockSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleBlockSubmit}
              disabled={blockSaving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {blockSaving
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Blocking...</>
                : <><Ban className="w-4 h-4 mr-2" /> Block</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
