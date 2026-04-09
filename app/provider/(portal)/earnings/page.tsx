"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CircleDollarSign, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProviderSectionHeader from "@/components/provider/ProviderSectionHeader";
import ProviderStatCard from "@/components/provider/ProviderStatCard";
import { useAuth } from "@/context/AuthContext";
import { getWorkerProfile } from "@/services/firebase/workerAuth";
import { formatInr } from "@/lib/provider/format";
import { useWorkerStore } from "@/store/workerStore";

function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export default function ProviderEarningsPage() {
  const { firebaseUser } = useAuth();
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawMethod, setWithdrawMethod] = useState<"bank" | "upi">("bank");

  const earnings = useWorkerStore((state) => state.earnings);
  const availableBalance = useWorkerStore((state) => state.availableBalance);
  const withdrawals = useWorkerStore((state) => state.withdrawals);
  const worker = useWorkerStore((state) => state.worker);
  const setWorker = useWorkerStore((state) => state.setWorker);
  const fetchEarnings = useWorkerStore((state) => state.fetchEarnings);
  const fetchWithdrawalHistory = useWorkerStore((state) => state.fetchWithdrawalHistory);
  const requestWithdrawal = useWorkerStore((state) => state.requestWithdrawal);

  useEffect(() => {
    if (!firebaseUser?.uid) return;
    void (async () => {
      const profile = await getWorkerProfile(firebaseUser.uid);
      if (profile) setWorker(profile);
      await Promise.all([fetchEarnings(), fetchWithdrawalHistory()]);
    })();
  }, [fetchEarnings, fetchWithdrawalHistory, firebaseUser?.uid, setWorker]);

  const totals = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const total = earnings.reduce((sum, item) => sum + item.net, 0);
    const today = earnings
      .filter((item) => (item.createdAt?.toMillis?.() ?? 0) >= todayStart)
      .reduce((sum, item) => sum + item.net, 0);
    const month = earnings
      .filter((item) => (item.createdAt?.toMillis?.() ?? 0) >= monthStart)
      .reduce((sum, item) => sum + item.net, 0);
    const grossMonth = earnings
      .filter((item) => (item.createdAt?.toMillis?.() ?? 0) >= monthStart)
      .reduce((sum, item) => sum + item.amount, 0);
    const commissionMonth = earnings
      .filter((item) => (item.createdAt?.toMillis?.() ?? 0) >= monthStart)
      .reduce((sum, item) => sum + item.commission, 0);

    return { total, today, month, grossMonth, commissionMonth };
  }, [earnings]);

  const weeklyTrend = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (6 - idx));
      const dayStart = startOfDay(d);
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      return earnings
        .filter((item) => {
          const t = item.createdAt?.toMillis?.() ?? 0;
          return t >= dayStart && t < dayEnd;
        })
        .reduce((sum, item) => sum + item.net, 0);
    });
  }, [earnings]);

  const max = Math.max(...weeklyTrend, 1);

  return (
    <div className="space-y-6">
      <ProviderSectionHeader
        eyebrow="Finance"
        title="Earnings"
        subtitle="Track payouts, commission, and business performance."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ProviderStatCard title="Total Earnings" value={formatInr(totals.total)} icon={CircleDollarSign} />
        <ProviderStatCard title="Today" value={formatInr(totals.today)} icon={CircleDollarSign} />
        <ProviderStatCard title="This Month" value={formatInr(totals.month)} icon={CircleDollarSign} />
        <ProviderStatCard title="Net Payout" value={formatInr(availableBalance)} icon={Landmark} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <article className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Weekly Earnings Trend</h2>
          <div className="mt-4 grid h-52 grid-cols-7 items-end gap-2">
            {weeklyTrend.map((value, i) => {
              const pct = Math.max(10, Math.round((value / max) * 100));
              return (
                <motion.div
                  key={`${value}-${i}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${pct}%` }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-t-md bg-foreground/90"
                  title={formatInr(value)}
                />
              );
            })}
          </div>
        </article>

        <article className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Commission Breakdown</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Platform commission is calculated from completed jobs.
          </p>
          <div className="mt-3 rounded-lg border border-border bg-muted p-3 text-sm">
            Gross monthly earnings: <span className="font-semibold">{formatInr(totals.grossMonth)}</span>
            <br />
            Commission deducted: <span className="font-semibold">{formatInr(totals.commissionMonth)}</span>
            <br />
            Available balance: <span className="font-semibold">{formatInr(availableBalance)}</span>
          </div>
          <Button
            className="mt-4 h-11 w-full"
            disabled={withdrawing || availableBalance < 500}
            onClick={() => {
              setWithdrawing(true);
              void requestWithdrawal(availableBalance, withdrawMethod).finally(() => setWithdrawing(false));
            }}
          >
            {withdrawing ? "Processing..." : "Withdraw Earnings"}
          </Button>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => setWithdrawMethod("bank")}
              className={`rounded-md border px-3 py-2 text-sm ${
                withdrawMethod === "bank" ? "border-foreground bg-foreground text-background" : "border-border"
              }`}
            >
              Bank
            </button>
            <button
              onClick={() => setWithdrawMethod("upi")}
              className={`rounded-md border px-3 py-2 text-sm ${
                withdrawMethod === "upi" ? "border-foreground bg-foreground text-background" : "border-border"
              }`}
            >
              UPI
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {withdrawMethod === "bank"
              ? worker?.bankDetails?.accountNumber
                ? `Bank account ending ${worker.bankDetails.accountNumber.slice(-4)}`
                : "Bank details not found. Add from profile."
              : worker?.bankDetails?.upiId
              ? `UPI ID: ${worker.bankDetails.upiId}`
              : "UPI not found. Add from profile."}
          </p>
        </article>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Withdrawal History</h2>
        {withdrawals.length ? (
          <div className="mt-3 space-y-2">
            {withdrawals.map((item) => (
              <div key={item.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                <p className="font-medium">{formatInr(item.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  {item.method.toUpperCase()} • {item.status} • {item.requestedAt?.toDate?.().toLocaleString?.() ?? "-"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No withdrawals yet.</p>
        )}
      </section>
    </div>
  );
}

