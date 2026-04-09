"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAdminStore } from "@/store/adminStore";
import { getDailyStats, type DailyStats } from "@/services/firebase/admin";

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-xs uppercase tracking-[0.12em] text-zinc-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-100">{value}</p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

function MiniBars({ data, colorClass }: { data: number[]; colorClass: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="mt-3 grid h-36 grid-cols-10 items-end gap-1">
      {data.map((value, idx) => (
        <div key={`${value}-${idx}`} className={colorClass} style={{ height: `${Math.max(8, (value / max) * 100)}%` }} />
      ))}
    </div>
  );
}

function formatDate(ts?: { toDate?: () => Date }) {
  return ts?.toDate?.()?.toLocaleDateString?.("en-IN") ?? "-";
}

export default function AdminDashboardPage() {
  const stats = useAdminStore((state) => state.stats);
  const pendingWorkers = useAdminStore((state) => state.pendingWorkers);
  const disputes = useAdminStore((state) => state.disputes);
  const allBookings = useAdminStore((state) => state.allBookings);
  const allWorkers = useAdminStore((state) => state.allWorkers);

  const fetchStats = useAdminStore((state) => state.fetchStats);
  const fetchPendingWorkers = useAdminStore((state) => state.fetchPendingWorkers);
  const fetchDisputes = useAdminStore((state) => state.fetchDisputes);
  const fetchAllBookings = useAdminStore((state) => state.fetchAllBookings);
  const fetchAllWorkers = useAdminStore((state) => state.fetchAllWorkers);

  const [daily, setDaily] = useState<DailyStats[]>([]);

  useEffect(() => {
    void fetchStats();
    void fetchPendingWorkers();
    void fetchDisputes();
    void fetchAllBookings();
    void fetchAllWorkers();
    void getDailyStats(30).then(setDaily).catch(() => setDaily([]));
  }, [fetchAllBookings, fetchAllWorkers, fetchDisputes, fetchPendingWorkers, fetchStats]);

  const revenueSeries = useMemo(() => daily.slice(-10).map((item) => item.commissionEarned || item.totalRevenue), [daily]);
  const bookingSeries = useMemo(() => daily.slice(-10).map((item) => item.totalBookings), [daily]);
  const workerSeries = useMemo(() => daily.slice(-10).map((item) => item.newWorkers), [daily]);

  const serviceDistribution = useMemo(() => {
    const byService = new Map<string, number>();
    allBookings.forEach((booking) => {
      const key = booking.service || "other";
      byService.set(key, (byService.get(key) ?? 0) + 1);
    });

    return Array.from(byService.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [allBookings]);

  const recentBookings = useMemo(() => allBookings.slice(0, 5), [allBookings]);
  const recentWorkers = useMemo(() => allWorkers.slice(0, 5), [allWorkers]);
  const recentDisputes = useMemo(() => disputes.slice(0, 5), [disputes]);

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Customers" value={stats?.totalCustomers ?? 0} />
        <StatCard label="Total Workers" value={stats?.totalWorkers ?? 0} />
        <StatCard label="Total Bookings" value={stats?.totalBookings ?? 0} />
        <StatCard label="Total Revenue" value={`Rs ${stats?.totalRevenue ?? 0}`} />
        <StatCard label="Pending Verifications" value={stats?.pendingVerifications ?? 0} />
        <StatCard label="Active Disputes" value={stats?.activeDisputes ?? 0} />
        <StatCard label="Today's Bookings" value={stats?.todayBookings ?? 0} />
        <StatCard label="Monthly Growth" value={`${stats?.monthlyGrowth ?? 0}%`} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="text-sm font-semibold text-zinc-100">Revenue Trend (Last 10 Days)</h2>
          <MiniBars data={revenueSeries} colorClass="bg-blue-500/80" />
        </article>
        <article className="border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="text-sm font-semibold text-zinc-100">Bookings Trend (Last 10 Days)</h2>
          <MiniBars data={bookingSeries} colorClass="bg-amber-500/80" />
        </article>
        <article className="border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="text-sm font-semibold text-zinc-100">Worker Growth (Last 10 Days)</h2>
          <MiniBars data={workerSeries} colorClass="bg-emerald-500/80" />
        </article>
        <article className="border border-zinc-800 bg-zinc-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">Service Distribution</h2>
            <Link href="/admin/bookings" className="text-xs text-blue-200 underline">View bookings</Link>
          </div>
          <div className="space-y-2">
            {serviceDistribution.map(([service, total]) => (
              <div key={service} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-zinc-300">
                  <span className="capitalize">{service}</span>
                  <span>{total}</span>
                </div>
                <div className="h-2 w-full bg-zinc-800">
                  <div
                    className="h-2 bg-blue-500"
                    style={{ width: `${Math.max(8, (total / Math.max(serviceDistribution[0]?.[1] ?? 1, 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {serviceDistribution.length === 0 ? (
              <p className="text-sm text-zinc-500">No booking distribution data yet.</p>
            ) : null}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="border border-zinc-800 bg-zinc-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Last 5 Bookings</h3>
            <Link href="/admin/bookings" className="text-xs underline">Open module</Link>
          </div>
          <div className="space-y-2">
            {recentBookings.map((booking) => (
              <div key={booking.id} className="border border-zinc-800 p-2 text-sm">
                <p className="font-medium">#{booking.id}</p>
                <p className="text-xs text-zinc-400">{booking.customerName} - {booking.workerName}</p>
                <p className="text-xs text-zinc-500">{booking.status} - Rs {booking.amount}</p>
              </div>
            ))}
            {recentBookings.length === 0 ? <p className="text-sm text-zinc-500">No recent bookings.</p> : null}
          </div>
        </article>

        <article className="border border-zinc-800 bg-zinc-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Last 5 Worker Registrations</h3>
            <Link href="/admin/workers" className="text-xs underline">Open module</Link>
          </div>
          <div className="space-y-2">
            {recentWorkers.map((worker) => (
              <div key={worker.uid} className="border border-zinc-800 p-2 text-sm">
                <p className="font-medium">{worker.name}</p>
                <p className="text-xs text-zinc-400">{worker.phone}</p>
                <p className="text-xs text-zinc-500">Joined: {formatDate(worker.createdAt)}</p>
              </div>
            ))}
            {recentWorkers.length === 0 ? <p className="text-sm text-zinc-500">No recent worker registrations.</p> : null}
          </div>
        </article>

        <article className="border border-zinc-800 bg-zinc-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Last 5 Disputes</h3>
            <Link href="/admin/disputes" className="text-xs underline">Open module</Link>
          </div>
          <div className="space-y-2">
            {recentDisputes.map((dispute) => (
              <div key={dispute.id} className="border border-zinc-800 p-2 text-sm">
                <p className="font-medium">#{dispute.id}</p>
                <p className="text-xs text-zinc-400">{dispute.reason} - {dispute.status}</p>
                <p className="text-xs text-zinc-500">Rs {dispute.amount}</p>
              </div>
            ))}
            {recentDisputes.length === 0 ? <p className="text-sm text-zinc-500">No recent disputes.</p> : null}
          </div>
        </article>
      </section>

      <section className="border border-zinc-800 bg-zinc-900 p-4">
        <h3 className="text-sm font-semibold">Verification Queue Snapshot</h3>
        <div className="mt-3 space-y-2">
          {pendingWorkers.slice(0, 5).map((worker) => (
            <div key={worker.uid} className="flex items-center justify-between border border-zinc-800 p-2 text-sm">
              <div>
                <p className="font-medium">{worker.name}</p>
                <p className="text-xs text-zinc-500">{worker.phone}</p>
              </div>
              <Link href="/admin/verification" className="text-xs text-blue-200 underline">Review</Link>
            </div>
          ))}
          {pendingWorkers.length === 0 ? <p className="text-sm text-zinc-500">No pending verifications.</p> : null}
        </div>
      </section>
    </div>
  );
}
