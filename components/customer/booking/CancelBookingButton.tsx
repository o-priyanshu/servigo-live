"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CancelBookingButtonProps {
  bookingId: string;
  status: string;
  scheduledAt: string;
  className?: string;
  successRedirect?: string;
}

function isWithinCancellationFeeWindow(scheduledAt: string): boolean {
  const when = new Date(scheduledAt).getTime();
  if (!Number.isFinite(when)) return false;
  const delta = when - Date.now();
  return delta >= 0 && delta <= 60 * 60 * 1000;
}

function isCancellable(status: string, scheduledAt: string): boolean {
  if (!["pending", "confirmed"].includes(status)) return false;
  const when = new Date(scheduledAt).getTime();
  if (!Number.isFinite(when)) return true;
  return when > Date.now();
}

export default function CancelBookingButton({
  bookingId,
  status,
  scheduledAt,
  className,
  successRedirect = "/dashboard?tab=bookings&popup=cancelled",
}: CancelBookingButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const hasCancellationFee = isWithinCancellationFeeWindow(scheduledAt);

  if (!isCancellable(status, scheduledAt)) return null;

  async function handleCancel() {
    setError("");
    try {
      setLoading(true);
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(data?.error ?? "Unable to cancel booking"));
      router.push(successRedirect);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unable to cancel booking");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      {!confirming ? (
        <Button
          type="button"
          variant="ghost"
          onClick={() => setConfirming(true)}
          className="h-9 rounded-lg border border-red-200 bg-red-50 px-3 text-red-700 hover:bg-red-100 hover:text-red-800"
        >
          <Ban size={14} className="mr-1.5" />
          Cancel Booking
        </Button>
      ) : (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2">
          <p className="text-xs font-medium text-red-800">Cancel this service booking?</p>
          {hasCancellationFee ? (
            <p className="mt-1 text-[11px] text-red-700">
              Cancelling within 1 hour can apply a 50% charge.
            </p>
          ) : null}
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="h-8 rounded-md bg-red-600 px-3 text-xs text-white hover:bg-red-700"
            >
              {loading ? "Cancelling..." : "Yes, cancel"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConfirming(false);
                setError("");
              }}
              disabled={loading}
              className="h-8 rounded-md px-3 text-xs"
            >
              Keep Booking
            </Button>
          </div>
        </div>
      )}
      {error ? <p className="mt-1 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
