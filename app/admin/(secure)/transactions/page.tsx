"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useAdminStore } from "@/store/adminStore";

export default function AdminTransactionsPage() {
  const allBookings = useAdminStore((state) => state.allBookings);
  const withdrawalRequests = useAdminStore((state) => state.withdrawalRequests);
  const fetchAllBookings = useAdminStore((state) => state.fetchAllBookings);
  const fetchWithdrawalRequests = useAdminStore((state) => state.fetchWithdrawalRequests);

  useEffect(() => {
    void fetchAllBookings();
    void fetchWithdrawalRequests();
  }, [fetchAllBookings, fetchWithdrawalRequests]);

  const totals = useMemo(() => {
    const completed = allBookings.filter((item) => item.status === "completed");
    const totalPaid = completed.reduce((sum, item) => sum + item.amount, 0);
    const commission = completed.reduce((sum, item) => sum + item.amount * 0.1, 0);
    const pendingWithdrawals = withdrawalRequests
      .filter((item) => item.status === "pending" || item.status === "processing")
      .reduce((sum, item) => sum + item.amount, 0);
    return { totalPaid, commission, pendingWithdrawals };
  }, [allBookings, withdrawalRequests]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Transactions</h1>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-400">Platform Revenue</p>
          <p className="text-2xl font-semibold">?{Math.round(totals.commission)}</p>
        </div>
        <div className="border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-400">Total Paid to Workers</p>
          <p className="text-2xl font-semibold">?{Math.round(totals.totalPaid - totals.commission)}</p>
        </div>
        <div className="border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-400">Pending Withdrawals</p>
          <p className="text-2xl font-semibold">?{Math.round(totals.pendingWithdrawals)}</p>
        </div>
      </section>

      <Link href="/admin/transactions/withdrawals" className="inline-block underline">
        Open Withdrawal Requests
      </Link>
    </div>
  );
}

