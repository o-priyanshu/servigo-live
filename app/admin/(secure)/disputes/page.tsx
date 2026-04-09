"use client";

import { useEffect, useState } from "react";
import { useAdminStore } from "@/store/adminStore";

export default function AdminDisputesPage() {
  const disputes = useAdminStore((state) => state.disputes);
  const fetchDisputes = useAdminStore((state) => state.fetchDisputes);
  const resolveDispute = useAdminStore((state) => state.resolveDispute);

  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    void fetchDisputes();
  }, [fetchDisputes]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Disputes</h1>

      <div className="space-y-3">
        {disputes.map((dispute) => (
          <section key={dispute.id} className="border border-zinc-800 bg-zinc-900 p-4">
            <p className="font-semibold">Dispute #{dispute.id}</p>
            <p className="text-sm text-zinc-400">Booking: {dispute.bookingId} • Raised by: {dispute.raisedBy}</p>
            <p className="mt-1 text-sm">Reason: {dispute.reason}</p>
            <p className="text-sm">Amount: ?{dispute.amount}</p>
            <p className="text-sm text-zinc-400">{dispute.description}</p>

            <textarea
              className="mt-3 min-h-16 w-full border border-zinc-700 bg-zinc-950 p-2 text-sm"
              placeholder="Admin notes"
              value={notes[dispute.id] ?? ""}
              onChange={(e) => setNotes((prev) => ({ ...prev, [dispute.id]: e.target.value }))}
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="bg-emerald-600 px-3 py-2 text-sm"
                onClick={() =>
                  void resolveDispute(dispute.id, {
                    action: "full_refund",
                    notes: notes[dispute.id] ?? "",
                  })
                }
              >
                Full Refund
              </button>
              <button
                className="bg-amber-600 px-3 py-2 text-sm"
                onClick={() =>
                  void resolveDispute(dispute.id, {
                    action: "partial_refund",
                    amount: Math.round(dispute.amount / 2),
                    notes: notes[dispute.id] ?? "",
                  })
                }
              >
                Partial Refund
              </button>
              <button
                className="bg-red-600 px-3 py-2 text-sm"
                onClick={() =>
                  void resolveDispute(dispute.id, {
                    action: "reject",
                    notes: notes[dispute.id] ?? "",
                  })
                }
              >
                Reject Claim
              </button>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

