"use client";

import { useEffect } from "react";
import { useAdminStore } from "@/store/adminStore";

export default function AdminWithdrawalsPage() {
  const withdrawalRequests = useAdminStore((state) => state.withdrawalRequests);
  const fetchWithdrawalRequests = useAdminStore((state) => state.fetchWithdrawalRequests);
  const processWithdrawal = useAdminStore((state) => state.processWithdrawal);

  useEffect(() => {
    void fetchWithdrawalRequests();
  }, [fetchWithdrawalRequests]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Withdrawal Requests</h1>

      <section className="overflow-x-auto border border-zinc-800 bg-zinc-900 p-3">
        <table className="min-w-full text-sm">
          <thead className="text-left text-zinc-400">
            <tr>
              <th className="px-2 py-2">Worker</th>
              <th className="px-2 py-2">Amount</th>
              <th className="px-2 py-2">Method</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Requested</th>
              <th className="px-2 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {withdrawalRequests.map((request) => (
              <tr key={request.id} className="border-t border-zinc-800">
                <td className="px-2 py-2">{request.workerName || request.workerId}</td>
                <td className="px-2 py-2">?{request.amount}</td>
                <td className="px-2 py-2">{request.method}</td>
                <td className="px-2 py-2">{request.status}</td>
                <td className="px-2 py-2">{request.requestedAt?.toDate?.().toLocaleString?.() ?? "-"}</td>
                <td className="px-2 py-2">
                  <div className="flex gap-2">
                    <button className="underline" onClick={() => void processWithdrawal(request.id, "processing")}>Processing</button>
                    <button className="text-emerald-300 underline" onClick={() => void processWithdrawal(request.id, "completed")}>Mark Paid</button>
                    <button className="text-red-300 underline" onClick={() => void processWithdrawal(request.id, "failed")}>Fail</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

