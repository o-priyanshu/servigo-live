"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface BookingResolutionPanelProps {
  bookingId: string;
  status: string;
  requestedExtensionMinutes?: number | null;
  serviceDeadlineAt?: string | null;
}

async function postWorkflowAction(
  bookingId: string,
  action: string,
  payload?: Record<string, unknown>
): Promise<void> {
  const res = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}/workflow`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...(payload ?? {}) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : "Unable to update booking.");
  }
}

export default function BookingResolutionPanel({
  bookingId,
  status,
  requestedExtensionMinutes,
  serviceDeadlineAt,
}: BookingResolutionPanelProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (status !== "awaiting_customer_confirmation" && status !== "extension_requested") {
    return null;
  }

  const isCompletionRequest = status === "awaiting_customer_confirmation";
  const isExtensionRequest = status === "extension_requested";

  async function handleAction(action: string) {
    try {
      setLoadingAction(action);
      setError("");
      await postWorkflowAction(bookingId, action, {
        requestedExtensionMinutes,
      });
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update booking.");
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
      {isCompletionRequest ? (
        <>
          <h3 className="text-base font-semibold">Worker requested completion approval</h3>
          <p className="mt-1 text-sm text-amber-800">
            Please confirm that the work is finished. Once you approve, the booking closes and both sides are released.
          </p>
        </>
      ) : null}

      {isExtensionRequest ? (
        <>
          <h3 className="text-base font-semibold">Worker requested more time</h3>
          <p className="mt-1 text-sm text-amber-800">
            {typeof requestedExtensionMinutes === "number" && requestedExtensionMinutes > 0
              ? `They asked for an extra ${requestedExtensionMinutes} minute${requestedExtensionMinutes === 1 ? "" : "s"}.`
              : "They asked for additional time to finish the work."}
            {serviceDeadlineAt ? ` Current deadline: ${new Date(serviceDeadlineAt).toLocaleString()}.` : ""}
          </p>
        </>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {isCompletionRequest ? (
          <>
            <Button
              type="button"
              className="h-10"
              disabled={loadingAction !== null}
              onClick={() => void handleAction("approve_completion")}
            >
              {loadingAction === "approve_completion" ? "Approving..." : "Approve Completion"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              disabled={loadingAction !== null}
              onClick={() => void handleAction("reject_completion")}
            >
              {loadingAction === "reject_completion" ? "Sending..." : "Request More Work"}
            </Button>
          </>
        ) : null}

        {isExtensionRequest ? (
          <>
            <Button
              type="button"
              className="h-10"
              disabled={loadingAction !== null}
              onClick={() => void handleAction("approve_extension")}
            >
              {loadingAction === "approve_extension" ? "Approving..." : "Approve Extension"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              disabled={loadingAction !== null}
              onClick={() => void handleAction("reject_extension")}
            >
              {loadingAction === "reject_extension" ? "Sending..." : "Reject Extension"}
            </Button>
          </>
        ) : null}
      </div>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
