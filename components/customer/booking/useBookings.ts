"use client";

import { useEffect, useMemo, useState } from "react";
import type { ServiceCategory } from "@/lib/types/index";
import type { CustomerBookingCardData } from "@/components/customer/shared/types";

type BookingViewFilter = "pending" | "confirmed" | "completed" | "cancelled";

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

export function useBookings(userId: string | undefined, bookingFilter: BookingViewFilter) {
  const [bookings, setBookings] = useState<CustomerBookingCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) {
      setBookings([]);
      setLoading(false);
      setError("");
      return;
    }
    let cancelled = false;
    const loadBookings = async (silent = false) => {
      try {
        if (!silent) setLoading(true);
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
        if (!cancelled) setBookings(mapped);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load bookings");
      } finally {
        if (!cancelled && !silent) setLoading(false);
      }
    };

    void loadBookings(false);
    const interval = window.setInterval(() => {
      void loadBookings(true);
    }, 8000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [userId]);

  const filteredBookings = useMemo(() => {
    if (bookingFilter === "pending") return bookings.filter((b) => b.status === "pending");
    if (bookingFilter === "confirmed") {
      return bookings.filter(
        (b) =>
          b.status === "confirmed" ||
          b.status === "in_progress" ||
          b.status === "awaiting_customer_confirmation" ||
          b.status === "extension_requested"
      );
    }
    if (bookingFilter === "completed") {
      return bookings.filter((b) => b.status === "completed");
    }
    return bookings.filter((b) => b.status === "cancelled");
  }, [bookings, bookingFilter]);

  return { bookings, loading, error, filteredBookings };
}
