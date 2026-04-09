"use client";

import { useEffect, useMemo, useState } from "react";
import { getDailyStats, type DailyStats } from "@/services/firebase/admin";

function Bars({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <div className="mt-3 grid h-36 grid-cols-12 items-end gap-1">
      {data.map((value, i) => (
        <div key={`${value}-${i}`} className="bg-emerald-500/80" style={{ height: `${Math.max(8, (value / max) * 100)}%` }} />
      ))}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState<"7" | "30" | "90">("30");
  const [rows, setRows] = useState<DailyStats[]>([]);

  useEffect(() => {
    void getDailyStats(Number(range)).then(setRows).catch(() => setRows([]));
  }, [range]);

  const bookingSeries = useMemo(() => rows.map((item) => item.totalBookings), [rows]);
  const revenueSeries = useMemo(() => rows.map((item) => item.totalRevenue), [rows]);
  const cancellationRate = useMemo(() => {
    const total = rows.reduce((sum, item) => sum + item.totalBookings, 0);
    const cancelled = rows.reduce((sum, item) => sum + item.cancelledBookings, 0);
    return total > 0 ? ((cancelled / total) * 100).toFixed(1) : "0.0";
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <select value={range} onChange={(e) => setRange(e.target.value as "7" | "30" | "90")} className="border border-zinc-700 bg-zinc-950 px-3 py-1 text-sm">
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="text-sm font-semibold">Bookings Trend</h2>
          <Bars data={bookingSeries} />
        </article>
        <article className="border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="text-sm font-semibold">Revenue Trend</h2>
          <Bars data={revenueSeries} />
        </article>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-400">Cancellation Rate</p>
          <p className="text-2xl font-semibold">{cancellationRate}%</p>
        </div>
        <div className="border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-400">Top Service</p>
          <p className="text-2xl font-semibold">Plumber</p>
        </div>
        <div className="border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-400">Repeat Booking Rate</p>
          <p className="text-2xl font-semibold">N/A</p>
        </div>
      </section>
    </div>
  );
}

