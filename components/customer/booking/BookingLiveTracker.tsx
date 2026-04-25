"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPin, Navigation, PhoneCall } from "lucide-react";
import { getWorkerLocation } from "@/services/firebase/location";
import { subscribeToBookingUpdates } from "@/services/firebase/booking";
import type { Booking } from "@/services/firebase/types";

type TimelineStep =
  | "confirmed"
  | "on_way"
  | "arrived"
  | "working"
  | "awaiting_confirmation"
  | "extension_requested"
  | "completed";

interface BookingLiveTrackerProps {
  bookingId: string;
  providerId: string;
  scheduledAt: string;
  initialStatus: string;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return earthRadiusKm * c;
}

function getStepFromStatus(status: string, distanceKm: number | null): TimelineStep {
  if (status === "completed") return "completed";
  if (status === "awaiting_customer_confirmation") return "awaiting_confirmation";
  if (status === "extension_requested") return "extension_requested";
  if (status === "in_progress") {
    if (distanceKm !== null && distanceKm <= 0.2) return "arrived";
    return "working";
  }
  if (status === "confirmed") return "confirmed";
  return "confirmed";
}

function etaFromDistance(distanceKm: number | null): number | null {
  if (distanceKm === null) return null;
  const avgCitySpeedKmPerHour = 20;
  const mins = Math.round((distanceKm / avgCitySpeedKmPerHour) * 60);
  return Math.max(1, mins);
}

const steps: Array<{ id: TimelineStep; label: string }> = [
  { id: "confirmed", label: "Confirmed" },
  { id: "on_way", label: "On way" },
  { id: "arrived", label: "Arrived" },
  { id: "working", label: "Working" },
  { id: "awaiting_confirmation", label: "Waiting approval" },
  { id: "extension_requested", label: "Extension requested" },
  { id: "completed", label: "Completed" },
];

export default function BookingLiveTracker({
  bookingId,
  providerId,
  scheduledAt,
  initialStatus,
}: BookingLiveTrackerProps) {
  const [status, setStatus] = useState(initialStatus);
  const [workerLocation, setWorkerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [customerLocation, setCustomerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [entryPhotoUrl, setEntryPhotoUrl] = useState<string | null>(null);
  const [locationIssue, setLocationIssue] = useState("");
  const [now, setNow] = useState<number>(() => Date.now());
  const geolocationSupported = typeof navigator !== "undefined" && "geolocation" in navigator;

  useEffect(() => {
    const unsubBooking = subscribeToBookingUpdates(bookingId, (booking: Booking) => {
      setStatus(booking.status);
      const row = booking as unknown as Record<string, unknown>;
      const entryPhoto = typeof row.entryPhoto === "string" ? row.entryPhoto : null;
      setEntryPhotoUrl(entryPhoto);
    });

    const unsubWorker = getWorkerLocation(providerId, (location) => {
      setWorkerLocation(location);
    });

    return () => {
      unsubBooking();
      unsubWorker();
    };
  }, [bookingId, providerId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!geolocationSupported) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCustomerLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setLocationIssue("Allow location for accurate ETA.");
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    );
  }, [geolocationSupported]);

  const distanceKm = useMemo(() => {
    if (!workerLocation || !customerLocation) return null;
    return haversineKm(workerLocation, customerLocation);
  }, [workerLocation, customerLocation]);

  const etaMinutes = useMemo(() => etaFromDistance(distanceKm), [distanceKm]);
  const activeStep = useMemo(() => getStepFromStatus(status, distanceKm), [status, distanceKm]);

  const cancellationWarning = useMemo(() => {
    const scheduledTs = new Date(scheduledAt).getTime();
    if (!Number.isFinite(scheduledTs)) return false;
    const msUntil = scheduledTs - now;
    return msUntil >= 0 && msUntil <= 60 * 60 * 1000;
  }, [now, scheduledAt]);

  if (status === "cancelled") {
    return null;
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-foreground">Live Tracking</h2>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span className="rounded-md bg-muted px-2 py-1 capitalize">Status: {status.replace("_", " ")}</span>
        {etaMinutes !== null ? (
          <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">ETA: {etaMinutes} min</span>
        ) : (
          <span className="rounded-md bg-muted px-2 py-1">ETA updating...</span>
        )}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => window.alert("Call will connect you to worker without sharing numbers")}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-foreground hover:bg-muted/60"
        >
          <PhoneCall size={14} />
          Call Worker
        </button>
        {workerLocation ? (
          <a
            href={`https://www.google.com/maps?q=${workerLocation.lat},${workerLocation.lng}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-foreground hover:bg-muted/60"
          >
            <Navigation size={14} />
            Open Live Map
          </a>
        ) : (
          <div className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-muted px-3 text-sm text-muted-foreground">
            Worker location unavailable
          </div>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-border bg-background p-3">
        <p className="text-xs font-medium text-muted-foreground">Status Timeline</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {steps.map((step) => {
            const isActive =
              steps.findIndex((s) => s.id === step.id) <= steps.findIndex((s) => s.id === activeStep);
            return (
              <div
                key={step.id}
                className={`rounded-lg border px-3 py-2 text-center text-xs ${
                  isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-border bg-card text-muted-foreground"
                }`}
              >
                {step.label}
              </div>
            );
          })}
        </div>
      </div>

      {workerLocation ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <iframe
            title="Worker live location"
            src={`https://maps.google.com/maps?q=${workerLocation.lat},${workerLocation.lng}&z=14&output=embed`}
            className="h-52 w-full"
            loading="lazy"
          />
        </div>
      ) : null}

      {distanceKm !== null ? (
        <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin size={12} />
          Worker is approximately {distanceKm.toFixed(1)} km away.
        </p>
      ) : null}
      {!geolocationSupported ? (
        <p className="mt-2 text-xs text-muted-foreground">Customer location unavailable.</p>
      ) : locationIssue ? (
        <p className="mt-2 text-xs text-muted-foreground">{locationIssue}</p>
      ) : null}

      {entryPhotoUrl ? (
        <div className="mt-4 rounded-xl border border-border bg-background p-3">
          <p className="text-xs font-medium text-muted-foreground">Entry Photo</p>
          <img
            src={entryPhotoUrl}
            alt="Worker entry proof"
            className="mt-2 h-40 w-full rounded-lg border border-border object-cover"
          />
        </div>
      ) : null}

      {cancellationWarning && (status === "pending" || status === "confirmed") ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Cancelling within 1 hour can apply a 50% cancellation charge.
        </p>
      ) : null}
    </section>
  );
}
