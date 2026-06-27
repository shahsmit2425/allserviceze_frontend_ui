/**
 * MyBookings — shared bookings list used in both CustomerDashboard and ProviderDashboard.
 * 
 * viewAs: "customer" | "provider"
 * subscriptionTier: provider's subscription tier (for video gating)
 */
import { useState, useEffect } from "react";
import logger from "@/utils/logger";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Skeleton } from "./ui/skeleton";
import { CalendarDays, Inbox } from "lucide-react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import BookingCard from "./BookingCard";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api`;

const TABS = [
  { value: "pending",   label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function MyBookings({ viewAs = "customer", subscriptionTier = "free", chatUID = null }) {
  const { getAuthHeader } = useAuth();
  const [bookings, setBookings]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState("pending");

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/bookings`, {
        withCredentials: true,
        headers: getAuthHeader(),
      });
      setBookings(res.data || []);
    } catch (err) {
      logger.error("Failed to fetch bookings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const filtered = bookings.filter((b) => b.status === activeTab);

  const pendingCount   = bookings.filter((b) => b.status === "pending").length;
  const confirmedCount = bookings.filter((b) => b.status === "confirmed").length;
  const completedCount = bookings.filter((b) => b.status === "completed").length;
  const cancelledCount = bookings.filter((b) => b.status === "cancelled").length;

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-white/80 bg-white/80 shadow-sm shadow-slate-900/5">
            <CalendarDays className="h-5 w-5 text-[#1B4332]" />
          </div>
          <div>
            <p className="caption">Schedule overview</p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-foreground sm:text-2xl">
              {viewAs === "provider" ? "My Appointments" : "My Bookings"}
            </h2>
          </div>
        </div>
        {pendingCount > 0 && (
          <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded-full border border-yellow-200">
            {pendingCount} pending
          </span>
        )}
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="info-tile">
          <p className="detail-kicker">Pending</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">{pendingCount}</p>
          <p className="mt-1 text-sm text-muted-foreground">Requests waiting for the next action.</p>
        </div>
        <div className="info-tile">
          <p className="detail-kicker">Confirmed</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">{confirmedCount}</p>
          <p className="mt-1 text-sm text-muted-foreground">Appointments ready for active coordination.</p>
        </div>
        <div className="info-tile">
          <p className="detail-kicker">Completed</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">{completedCount}</p>
          <p className="mt-1 text-sm text-muted-foreground">Finished bookings that stay in your history.</p>
        </div>
        <div className="info-tile">
          <p className="detail-kicker">Cancelled</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">{cancelledCount}</p>
          <p className="mt-1 text-sm text-muted-foreground">Cancelled requests and expired scheduling attempts.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-5 h-auto flex-wrap gap-2 rounded-[1.2rem] border border-white/80 bg-white/80 p-1.5 shadow-sm shadow-slate-900/5">
          {TABS.map(({ value, label }) => {
            const count = bookings.filter((b) => b.status === value).length;
            return (
              <TabsTrigger key={value} value={value} className="relative px-3.5 py-2 text-sm">
                {label}
                {count > 0 && (
                  <span className={`ml-1.5 text-xs font-bold px-1.5 py-0.5 rounded-full
                    ${value === "pending"   ? "bg-yellow-100 text-yellow-700"
                    : value === "confirmed" ? "bg-blue-100 text-blue-700"
                    : value === "completed" ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"}`}>
                    {count}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {TABS.map(({ value }) => (
          <TabsContent key={value} value={value} className="space-y-3">
            {loading ? (
              <>
                <Skeleton className="h-56 w-full rounded-[1.75rem]" />
                <Skeleton className="h-56 w-full rounded-[1.75rem]" />
              </>
            ) : filtered.length === 0 ? (
              <EmptyState status={value} viewAs={viewAs} />
            ) : (
              filtered.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  viewAs={viewAs}
                  subscriptionTier={subscriptionTier}
                  onUpdate={fetchBookings}
                />
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function EmptyState({ status, viewAs }) {
  const messages = {
    pending:   viewAs === "provider" ? "No pending booking requests." : "No pending bookings.",
    confirmed: "No confirmed appointments.",
    completed: "No completed appointments yet.",
    cancelled: "No cancelled bookings.",
  };
  return (
    <div className="empty-state-panel flex flex-col items-center justify-center border-0 py-12 text-center">
      <Inbox className="mb-4 h-10 w-10 opacity-30" />
      <p className="text-base font-medium text-foreground/80">{messages[status] || "Nothing here yet."}</p>
    </div>
  );
}
