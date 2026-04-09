"use client";

import { useState } from "react";
import type { VerificationStatus } from "@/lib/admin/types";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import ConfirmActionDialog from "@/components/admin/shared/ConfirmActionDialog";

interface ProviderStatusControlsProps {
  providerId: string;
  initialStatus: VerificationStatus;
}

export default function ProviderStatusControls({
  providerId,
  initialStatus,
}: ProviderStatusControlsProps) {
  const [status, setStatus] = useState<VerificationStatus>(initialStatus);
  const [pendingAction, setPendingAction] = useState<VerificationStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const actionLabelMap: Record<VerificationStatus, string> = {
    pending: "Mark Pending",
    verified: "Approve",
    rejected: "Reject",
    suspended: "Suspend",
  };

  const destructive = pendingAction === "suspended" || pendingAction === "rejected";
  const apiActionMap: Record<VerificationStatus, "approve" | "reject" | "suspend"> = {
    pending: "reject",
    verified: "approve",
    rejected: "reject",
    suspended: "suspend",
  };

  async function applyAction(nextStatus: VerificationStatus) {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/providers/${providerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: apiActionMap[nextStatus] }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        status?: VerificationStatus;
      };

      if (!response.ok || !data.status) {
        throw new Error(data.error ?? "Failed to update provider status");
      }

      setStatus(data.status);
      setPendingAction(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update provider status");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-sm text-zinc-400">Current status:</p>
        <StatusBadge status={status} />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["verified", "rejected", "suspended", "pending"] as VerificationStatus[]).map((nextStatus) => (
          <button
            key={nextStatus}
            type="button"
            disabled={submitting}
            onClick={() => setPendingAction(nextStatus)}
            className="border border-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionLabelMap[nextStatus]}
          </button>
        ))}
      </div>
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}

      <ConfirmActionDialog
        open={pendingAction !== null}
        title="Confirm Provider Status Change"
        description={`You are about to set provider status to ${pendingAction ?? ""}. This action is audited.`}
        confirmLabel={submitting ? "Applying..." : "Apply Change"}
        destructive={destructive}
        onCancel={() => {
          if (!submitting) {
            setPendingAction(null);
          }
        }}
        onConfirm={() => {
          if (!pendingAction || submitting) return;
          void applyAction(pendingAction);
        }}
      />
    </div>
  );
}
