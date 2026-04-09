"use client";

import { useState } from "react";
import type { Report } from "@/lib/admin/types";
import ConfirmActionDialog from "@/components/admin/shared/ConfirmActionDialog";
import StatusBadge from "@/components/admin/shared/StatusBadge";

export default function ReportActionControls({ report }: { report: Report }) {
  const [status, setStatus] = useState(report.status);
  const [action, setAction] = useState<"dismiss" | "investigate" | "suspend" | null>(null);

  return (
    <>
      <div className="flex items-center gap-2">
        <StatusBadge status={status} />
        <div className="flex gap-1">
          <button className="border border-zinc-700 px-2 py-1 text-[11px]" onClick={() => setAction("dismiss")}>Dismiss</button>
          <button className="border border-zinc-700 px-2 py-1 text-[11px]" onClick={() => setAction("investigate")}>Investigate</button>
          <button className="border border-zinc-700 px-2 py-1 text-[11px]" onClick={() => setAction("suspend")}>Suspend</button>
        </div>
      </div>
      <ConfirmActionDialog
        open={action !== null}
        title="Confirm Report Action"
        description="This moderation decision is security-sensitive and will be audited."
        confirmLabel="Apply"
        destructive={action === "suspend"}
        onCancel={() => setAction(null)}
        onConfirm={() => {
          if (action === "dismiss") setStatus("dismissed");
          if (action === "investigate") setStatus("under_investigation");
          setAction(null);
        }}
      />
    </>
  );
}

