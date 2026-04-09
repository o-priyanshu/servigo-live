"use client";

import { useState } from "react";
import type { BookingStatus } from "@/lib/admin/types";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import ConfirmActionDialog from "@/components/admin/shared/ConfirmActionDialog";

export default function BookingActionControls({ initialStatus }: { initialStatus: BookingStatus }) {
  const [status, setStatus] = useState<BookingStatus>(initialStatus);
  const [action, setAction] = useState<"refund" | "force_complete" | "cancel" | "investigate" | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-xs text-zinc-400">Current:</p>
        <StatusBadge status={status} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="border border-zinc-700 px-3 py-2 text-xs" onClick={() => setAction("refund")}>Refund</button>
        <button className="border border-zinc-700 px-3 py-2 text-xs" onClick={() => setAction("force_complete")}>Force Complete</button>
        <button className="border border-zinc-700 px-3 py-2 text-xs" onClick={() => setAction("cancel")}>Cancel Booking</button>
        <button className="border border-zinc-700 px-3 py-2 text-xs" onClick={() => setAction("investigate")}>Escalate Investigation</button>
      </div>

      <ConfirmActionDialog
        open={action !== null}
        title="Confirm Booking Operation"
        description="This operational action is sensitive and will be logged in audit records."
        confirmLabel="Execute"
        destructive={action === "cancel" || action === "refund"}
        onCancel={() => setAction(null)}
        onConfirm={() => {
          if (action === "force_complete") setStatus("completed");
          if (action === "cancel") setStatus("cancelled");
          if (action === "investigate") setStatus("fraud_flagged");
          setAction(null);
        }}
      />
    </div>
  );
}

