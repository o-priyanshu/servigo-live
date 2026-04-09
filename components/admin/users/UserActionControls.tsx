"use client";

import { useState } from "react";
import type { AccountStatus } from "@/lib/admin/types";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import ConfirmActionDialog from "@/components/admin/shared/ConfirmActionDialog";

export default function UserActionControls({ initialStatus }: { initialStatus: AccountStatus }) {
  const [status, setStatus] = useState<AccountStatus>(initialStatus);
  const [action, setAction] = useState<AccountStatus | null>(null);

  return (
    <>
      <div className="flex items-center gap-2">
        <StatusBadge status={status} />
        <div className="flex gap-1">
          <button className="border border-zinc-700 px-2 py-1 text-[11px]" onClick={() => setAction("warned")}>Warn</button>
          <button className="border border-zinc-700 px-2 py-1 text-[11px]" onClick={() => setAction("suspended")}>Suspend</button>
        </div>
      </div>
      <ConfirmActionDialog
        open={action !== null}
        title="Confirm Account Action"
        description={`Change account status to ${action ?? ""}. This action may impact ongoing bookings.`}
        confirmLabel="Proceed"
        destructive={action === "suspended"}
        onCancel={() => setAction(null)}
        onConfirm={() => {
          if (!action) return;
          setStatus(action);
          setAction(null);
        }}
      />
    </>
  );
}

