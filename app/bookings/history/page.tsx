"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Calendar, Clock, MapPin } from "lucide-react";
import CustomerPageNav from "@/components/customer/shared/CustomerPageNav";
import type { ServiceCategory } from "@/lib/types/index";
import type { CustomerBookingCardData } from "@/components/customer/shared/types";

interface ApiBooking {
  id: string;
  providerId?: string;
  providerName?: string;
  providerPhoto?: string;
  providerPhotoUpdatedAt?: string;
  serviceCategory?: string;
  status?: string;
  scheduledAt?: string;
  address?: string;
  amount?: number;
}

function withVersionedImage(url: string, version: string): string {
  if (!url || !version) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(version)}`;
}

export default function BookingHistoryPage() {
  const [bookings, setBookings] = useState<CustomerBookingCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"all" | "completed" | "cancelled">("all");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/bookings", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? "Failed to load bookings");
        const rows: ApiBooking[] = Array.isArray(data.bookings) ? data.bookings : [];
        const mapped: CustomerBookingCardData[] = rows.map((b) => ({
          id: String(b.id),
          providerId: String(b.providerId ?? ""),
          providerName: String(b.providerName ?? "Provider"),
          providerPhoto: withVersionedImage(
            String(b.providerPhoto ?? ""),
            String(b.providerPhotoUpdatedAt ?? "")
          ),
          serviceCategory: (b.serviceCategory ?? "electrician") as ServiceCategory,
          status: (b.status ?? "pending") as CustomerBookingCardData["status"],
          scheduledAt: String(b.scheduledAt ?? new Date().toISOString()),
          address: String(b.address ?? ""),
          amount: Number(b.amount ?? 0),
          durationHours: 1,
        }));
        if (!cancelled) {
          setBookings(mapped.filter((row) => row.status === "completed" || row.status === "cancelled"));
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load booking history");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (tab === "all") return bookings;
    return bookings.filter((b) => b.status === tab);
  }, [bookings, tab]);

  return (
    <main className="min-h-screen bg-muted/40">
      <CustomerPageNav />
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Bookings</p>
            <h1 className="text-2xl font-bold text-foreground">History</h1>
          </div>
          <Link
            href="/dashboard?tab=bookings"
            className="inline-flex h-9 items-center rounded-md border border-border bg-card px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Back to Requests
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-card p-2">
          {(["all", "completed", "cancelled"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-lg px-3 py-2 text-sm font-medium capitalize ${
                tab === key ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        {loading ? <p className="text-sm text-muted-foreground">Loading history...</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {!loading && filtered.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            No history items found.
          </p>
        ) : null}

        <div className="space-y-3">
          {filtered.map((booking) => {
            const schedule = new Date(booking.scheduledAt);
            return (
              <article key={booking.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{booking.providerName}</p>
                    <p className="text-sm capitalize text-muted-foreground">{booking.serviceCategory}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      booking.status === "completed"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {booking.status}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                  <p className="inline-flex items-center gap-1">
                    <Calendar size={13} /> {Number.isNaN(schedule.getTime()) ? booking.scheduledAt : schedule.toLocaleDateString()}
                  </p>
                  <p className="inline-flex items-center gap-1">
                    <Clock size={13} /> {Number.isNaN(schedule.getTime()) ? "-" : schedule.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="inline-flex items-center gap-1">
                    <MapPin size={13} /> {booking.address || "Home Service"}
                  </p>
                </div>
                <div className="mt-3">
                  <Link
                    href={`/bookings/${booking.id}?from=${encodeURIComponent("/bookings/history")}`}
                    className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm hover:bg-muted"
                  >
                    View Details
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
