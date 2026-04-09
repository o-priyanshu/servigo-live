"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeIndianRupee,
  CalendarCheck2,
  MapPin,
  PhoneCall,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import BookingCard from "@/components/customer/booking/BookingCard";
import EmptyState  from "@/components/customer/shared/EmptyState";
import type { CustomerBookingCardData } from "@/components/customer/shared/types";
import { useRouter } from "next/navigation";

type BookingFilter = "pending" | "confirmed" | "cancelled";

const MESSAGE_ALLOWED = new Set(["pending", "confirmed", "in_progress", "completed"]);

function canMessageBooking(status: CustomerBookingCardData["status"]) {
  return MESSAGE_ALLOWED.has(status);
}

function formatCategoryLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

interface Props {
  loading: boolean;
  error: string;
  bookingFilter: BookingFilter;
  setBookingFilter: (f: BookingFilter) => void;
  filteredBookings: CustomerBookingCardData[];
}

export default function DashboardBookings({
  loading,
  error,
  bookingFilter,
  setBookingFilter,
  filteredBookings,
}: Props) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const visibleBookings = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    const fromTs = startDate ? new Date(`${startDate}T00:00:00`).getTime() : NaN;
    const toTs = endDate ? new Date(`${endDate}T23:59:59`).getTime() : NaN;

    return filteredBookings.filter((booking) => {
      const bookingTs = new Date(booking.scheduledAt).getTime();

      const inSearch = !search
        ? true
        : `${booking.providerName} ${booking.serviceCategory}`.toLowerCase().includes(search);
      const inFrom = Number.isNaN(fromTs) ? true : (Number.isFinite(bookingTs) && bookingTs >= fromTs);
      const inTo = Number.isNaN(toTs) ? true : (Number.isFinite(bookingTs) && bookingTs <= toTs);

      return inSearch && inFrom && inTo;
    });
  }, [endDate, filteredBookings, searchQuery, startDate]);

  const selectedBooking = visibleBookings[0];

  function handleDownloadReceipt(booking: CustomerBookingCardData) {
    const html = `
      <html>
        <head><title>ServiGo Receipt</title></head>
        <body style="font-family: Arial, sans-serif; padding: 24px;">
          <h2>ServiGo Receipt</h2>
          <p><strong>Booking ID:</strong> ${booking.id}</p>
          <p><strong>Provider:</strong> ${booking.providerName}</p>
          <p><strong>Service:</strong> ${booking.serviceCategory.replaceAll("_", " ")}</p>
          <p><strong>Amount:</strong> Rs ${booking.amount ?? 0}</p>
          <p><strong>Status:</strong> ${booking.status.replaceAll("_", " ")}</p>
          <p><strong>Address:</strong> ${booking.address ?? "Home Service"}</p>
          <p><strong>Scheduled:</strong> ${new Date(booking.scheduledAt).toLocaleString()}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        </body>
      </html>
    `;
    const receiptWindow = window.open("", "_blank", "width=640,height=800");
    if (!receiptWindow) return;
    receiptWindow.document.write(html);
    receiptWindow.document.close();
    receiptWindow.focus();
    receiptWindow.print();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-4 sm:px-6 sm:py-6">
      <div className="rounded-2xl border border-border/70 bg-card/85 p-4 shadow-sm sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Dashboard</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">My Requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track pending, confirmed, and cancelled requests.</p>
      </div>

      <div className="flex w-full flex-nowrap gap-2 overflow-x-auto rounded-2xl border border-border/70 bg-card/85 p-2 shadow-sm">
        {[
          { key: "pending", label: "Pending" },
          { key: "confirmed", label: "Confirmed" },
          { key: "cancelled", label: "Cancelled" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setBookingFilter(item.key as BookingFilter)}
            className={`min-w-0 flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition ${
              bookingFilter === item.key
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-2 rounded-2xl border border-border/70 bg-card/85 p-3 shadow-sm md:grid-cols-3">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by provider or service"
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none"
        />
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none"
        />
      </div>

      {!loading ? (
        <p className="text-xs text-muted-foreground">
          Showing {visibleBookings.length} booking{visibleBookings.length === 1 ? "" : "s"}
        </p>
      ) : null}

      {visibleBookings.length > 0 ? (
        visibleBookings.map((booking, index) => (
          <BookingCard
            key={booking.id}
            booking={booking}
            index={index}
            canMessage={canMessageBooking(booking.status)}
          />
        ))
      ) : (
        <EmptyState
          title={loading ? "Loading bookings..." : "No bookings yet"}
          description={error || "Your scheduled services will appear here."}
          className="md:min-h-[260px] md:flex md:flex-col md:items-center md:justify-center"
        />
      )}

      {selectedBooking && (
        <section className="space-y-3 rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
          <h3 className="text-lg font-semibold text-foreground">Booking Summary</h3>
          <div className="rounded-xl border border-border/70 bg-background p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Service Provider</p>
            <p className="mt-1 font-semibold text-foreground">{selectedBooking.providerName}</p>
            <p className="text-sm text-muted-foreground">{formatCategoryLabel(selectedBooking.serviceCategory)}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button className="h-10 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
                <PhoneCall size={14} className="mr-2" />
                Call Provider
              </Button>
              <Button
                variant="outline"
                className="h-10 rounded-lg"
                disabled={!canMessageBooking(selectedBooking.status)}
                onClick={() =>
                  canMessageBooking(selectedBooking.status) &&
                  router.push(`/chat/${selectedBooking.id}`)
                }
              >
                {canMessageBooking(selectedBooking.status) ? "Message" : "Messaging Locked"}
              </Button>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                className="h-10 rounded-lg"
                onClick={() => router.push(`/bookings/${selectedBooking.id}?from=${encodeURIComponent("/dashboard?tab=bookings")}`)}
              >
                View Details
              </Button>
              <Button
                variant="outline"
                className="h-10 rounded-lg"
                onClick={() => handleDownloadReceipt(selectedBooking)}
              >
                Download Receipt
              </Button>
            </div>
          </div>
          <div className="rounded-xl border border-border/70 bg-background p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Appointment Details</p>
            <div className="mt-2 space-y-2 text-sm">
              <p className="inline-flex items-center gap-2 text-foreground">
                <CalendarCheck2 size={15} className="text-emerald-600" />
                {new Date(selectedBooking.scheduledAt).toLocaleString()}
              </p>
              <p className="inline-flex items-center gap-2 text-foreground">
                <MapPin size={15} className="text-emerald-600" />
                {selectedBooking.address ?? "Home Service"}
              </p>
              <p className="inline-flex items-center gap-2 text-foreground">
                <BadgeIndianRupee size={15} className="text-emerald-600" />
                Rs {selectedBooking.amount ?? 0}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="inline-flex items-center gap-2 font-semibold text-amber-800">
              <AlertTriangle size={16} />
              Important Reminders
            </p>
            <p className="mt-1 text-sm text-amber-700">Keep your phone reachable around service time.</p>
          </div>
        </section>
      )}
    </div>
  );
}
