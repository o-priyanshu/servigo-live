"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  BriefcaseBusiness,
  CircleDollarSign,
  Star,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ProviderJobCard from "@/components/provider/ProviderJobCard";
import ProviderSectionHeader from "@/components/provider/ProviderSectionHeader";
import ProviderStatCard from "@/components/provider/ProviderStatCard";
import ProviderStatusPill from "@/components/provider/ProviderStatusPill";
import { ProviderEmptyState } from "@/components/provider/ProviderStates";
import { providerQuickLinks } from "@/components/provider/provider-nav";
import { useAuth } from "@/context/AuthContext";
import { getWorkerProfile } from "@/services/firebase/workerAuth";
import { getJobHistory } from "@/services/firebase/workerJobs";
import { formatInr } from "@/lib/provider/format";
import type { Job } from "@/lib/types/provider";
import type { WorkerJob } from "@/services/firebase/types";
import { useWorkerStore } from "@/store/workerStore";

function toIso(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

function toEpochMillis(value: unknown): number | undefined {
  if (!value) return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const ts = new Date(value).getTime();
    return Number.isFinite(ts) ? ts : undefined;
  }
  if (typeof value === "object" && value !== null && "toMillis" in value) {
    const maybe = value as { toMillis?: () => number };
    if (typeof maybe.toMillis === "function") return maybe.toMillis();
  }
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const maybe = value as { toDate?: () => Date };
    if (typeof maybe.toDate === "function") return maybe.toDate().getTime();
  }
  return undefined;
}

export default function ProviderDashboardPage() {
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const workerUid = firebaseUser?.uid ?? "";

  const worker = useWorkerStore((state) => state.worker);
  const isOnline = useWorkerStore((state) => state.isAvailable);
  const pendingJobs = useWorkerStore((state) => state.pendingJobs);
  const activeJobs = useWorkerStore((state) => state.activeJobs);
  const earnings = useWorkerStore((state) => state.earnings);
  const setWorker = useWorkerStore((state) => state.setWorker);
  const setAvailability = useWorkerStore((state) => state.setAvailability);
  const fetchActiveJobs = useWorkerStore((state) => state.fetchActiveJobs);
  const fetchPendingJobs = useWorkerStore((state) => state.fetchPendingJobs);
  const fetchEarnings = useWorkerStore((state) => state.fetchEarnings);
  const subscribeToPendingJobs = useWorkerStore((state) => state.subscribeToPendingJobs);
  const acceptJob = useWorkerStore((state) => state.acceptJob);
  const declineJob = useWorkerStore((state) => state.declineJob);
  const updateJobStatus = useWorkerStore((state) => state.updateJobStatus);
  const requestJobCompletion = useWorkerStore((state) => state.requestJobCompletion);
  const updateLocation = useWorkerStore((state) => state.updateLocation);
  const [recentJobs, setRecentJobs] = useState<WorkerJob[]>([]);
  const [allJobs, setAllJobs] = useState<WorkerJob[]>([]);

  const refreshHistory = useCallback(async () => {
    if (!workerUid) return;
    const [history, historyForStats] = await Promise.all([
      getJobHistory(workerUid, 5),
      getJobHistory(workerUid, 200),
    ]);
    setRecentJobs(history);
    setAllJobs(historyForStats);
  }, [workerUid]);

  useEffect(() => {
    if (!workerUid) return;

    let unsubPending: (() => void) | null = null;
    void (async () => {
      const profile = await getWorkerProfile(workerUid);
      if (!profile) {
        router.replace("/provider/register");
        return;
      }

      if (profile.verificationStatus === "pending") {
        router.replace("/provider/pending-verification");
        return;
      }
      if (profile.verificationStatus === "rejected") {
        router.replace("/provider/pending-verification");
        return;
      }

      setWorker(profile);
      await Promise.all([refreshHistory(), fetchActiveJobs(), fetchPendingJobs(), fetchEarnings()]);
      unsubPending = subscribeToPendingJobs();
    })();

    return () => {
      unsubPending?.();
    };
  }, [
    workerUid,
    fetchActiveJobs,
    fetchEarnings,
    fetchPendingJobs,
    refreshHistory,
    router,
    setWorker,
    subscribeToPendingJobs,
  ]);

  useEffect(() => {
    if (!workerUid) return;
    const timer = window.setInterval(() => {
      void Promise.all([refreshHistory(), fetchActiveJobs(), fetchPendingJobs(), fetchEarnings()]);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [workerUid, refreshHistory, fetchActiveJobs, fetchPendingJobs, fetchEarnings]);

  useEffect(() => {
    if (!isOnline || typeof window === "undefined" || !("geolocation" in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        void updateLocation(position.coords.latitude, position.coords.longitude);
      },
      () => {
        // Ignore UI disruptions for permission/location errors.
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 15_000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isOnline, updateLocation]);

  const incomingJobs = useMemo<Job[]>(
    () =>
      pendingJobs.map((job) => ({
        id: job.id,
        bookingId: job.bookingId,
        customerName: job.customerName,
        serviceType: job.service,
        description: job.description,
        address: job.customerAddress?.fullAddress ?? "",
        city: "",
        distanceKm: job.distance,
        scheduledAtIso: toIso(job.scheduledTime),
        paymentEstimateInr: job.estimatedPrice,
        status: "incoming",
        canMessage: false,
        customerPhone: job.customerPhone,
        customerRating: job.customerRating,
        expiresAtMs: toEpochMillis(job.expiresAt),
      })),
    [pendingJobs]
  );

  const active = useMemo<Job[]>(() => {
    return activeJobs.map((job) => ({
      id: job.id,
      bookingId: job.bookingId,
      customerName: job.customerName,
      serviceType: job.service,
      description: job.description,
      address: job.customerAddress?.fullAddress ?? "",
      city: "",
      distanceKm: 0,
      scheduledAtIso: toIso(job.scheduledTime),
      paymentEstimateInr: job.price?.base ?? 0,
      status:
        job.status === "working"
          ? "in_progress"
          : job.status === "on_way" || job.status === "arrived"
          ? "on_the_way"
          : job.status === "completion_requested"
          ? "waiting_customer"
          : job.status === "extension_requested"
          ? "extension_requested"
          : job.status === "completed"
          ? "completed"
          : job.status === "cancelled"
          ? "cancelled"
          : "accepted",
      canMessage: true,
      customerPhone: job.customerPhone,
    }));
  }, [activeJobs]);

  const todayEarnings = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return earnings
      .filter((item) => (item.createdAt?.toMillis?.() ?? 0) >= start.getTime())
      .reduce((sum, item) => sum + item.net, 0);
  }, [earnings]);

  const completedJobsCount = useMemo(
    () => allJobs.filter((item) => item.status === "completed").length,
    [allJobs]
  );
  const cancelledJobsCount = useMemo(
    () => allJobs.filter((item) => item.status === "cancelled").length,
    [allJobs]
  );
  const totalJobsCount = useMemo(() => allJobs.length, [allJobs]);
  const pendingJobsCount = useMemo(() => pendingJobs.length, [pendingJobs.length]);
  const responseRate = useMemo(() => {
    const actionable = pendingJobsCount + completedJobsCount + cancelledJobsCount;
    if (actionable <= 0) return Math.round(worker?.responseRate ?? 0);
    const responded = completedJobsCount + cancelledJobsCount;
    return Math.round((responded / actionable) * 100);
  }, [cancelledJobsCount, completedJobsCount, pendingJobsCount, worker?.responseRate]);
  const cancellationRate = useMemo(() => {
    const resolved = completedJobsCount + cancelledJobsCount;
    if (resolved <= 0) return Math.round(worker?.cancellationRate ?? 0);
    return Math.round((cancelledJobsCount / resolved) * 100);
  }, [cancelledJobsCount, completedJobsCount, worker?.cancellationRate]);

  async function handleAcceptJob(id: string) {
    try {
      await acceptJob(id);
      toast.success("✓ Job Accepted! Moving to Active Jobs.");
      // Small delay to let user see the success message
      await new Promise(r => setTimeout(r, 500));
      await Promise.all([refreshHistory(), fetchActiveJobs(), fetchPendingJobs(), fetchEarnings()]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to accept job";
      toast.error(`Unable to accept: ${errorMsg}`);
      // Refresh to ensure UI is in sync
      await Promise.all([refreshHistory(), fetchActiveJobs(), fetchPendingJobs(), fetchEarnings()]);
    }
  }

  async function handleDeclineJob(id: string) {
    try {
      await declineJob(id);
      toast.success("✓ Job Declined");
      await new Promise(r => setTimeout(r, 500));
      await Promise.all([refreshHistory(), fetchActiveJobs(), fetchPendingJobs(), fetchEarnings()]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to decline job";
      toast.error(`Unable to decline: ${errorMsg}`);
      await Promise.all([refreshHistory(), fetchActiveJobs(), fetchPendingJobs(), fetchEarnings()]);
    }
  }

  async function handleAdvanceJob(id: string) {
    try {
      const source = activeJobs.find((entry) => entry.id === id);
      const nextStatus =
        source?.status === "accepted"
          ? "on_way"
          : source?.status === "on_way"
          ? "arrived"
          : source?.status === "arrived"
          ? "working"
          : source?.status ?? "working";
      
      await updateJobStatus(id, nextStatus, {
        bookingId: source?.bookingId,
        workerId: source?.workerId,
      });
      
      const statusLabels: Record<string, string> = {
        on_way: "On the Way",
        arrived: "Arrived",
        working: "Started Work",
      };
      
      toast.success(`✓ ${statusLabels[nextStatus] || "Status Updated"}`);
      await Promise.all([refreshHistory(), fetchActiveJobs(), fetchPendingJobs(), fetchEarnings()]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to update job";
      toast.error(`Failed to update job: ${errorMsg}`);
    }
  }

  async function handleCompleteJob(id: string) {
    try {
      const source = activeJobs.find((entry) => entry.id === id);
      await requestJobCompletion(id, source?.bookingId ?? "");
      toast.success("✓ Completion request sent to customer");
      await Promise.all([refreshHistory(), fetchActiveJobs(), fetchPendingJobs(), fetchEarnings()]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to request completion";
      toast.error(`Failed to request completion: ${errorMsg}`);
    }
  }

  return (
    <div className="space-y-6">
      <ProviderSectionHeader
        eyebrow="Operations"
        title="Provider Dashboard"
        subtitle="Manage your availability, incoming requests, and active work pipeline."
        right={
          <button
            onClick={() => void setAvailability(!isOnline)}
            suppressHydrationWarning
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
              isOnline
                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                : "border-border bg-card text-foreground"
            }`}
          >
            {isOnline ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            {isOnline ? "Online" : "Offline"}
          </button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ProviderStatCard
          title="Availability"
          value={isOnline ? "Online" : "Offline"}
          hint="Provider status"
          icon={ToggleRight}
        />
        <ProviderStatCard
          title="Earnings Today"
          value={formatInr(todayEarnings)}
          hint="Net earnings"
          icon={CircleDollarSign}
        />
        <ProviderStatCard
          title="Active Jobs"
          value={String(active.length)}
          hint="In progress or accepted"
          icon={BriefcaseBusiness}
        />
        <ProviderStatCard
          title="Pending Jobs"
          value={String(pendingJobsCount)}
          hint="Waiting for response"
          icon={BriefcaseBusiness}
        />
        <ProviderStatCard
          title="Completed Jobs"
          value={String(completedJobsCount)}
          hint="From job history"
          icon={BriefcaseBusiness}
        />
        <ProviderStatCard
          title="Total Jobs"
          value={String(totalJobsCount)}
          hint="All tracked jobs"
          icon={BriefcaseBusiness}
        />
        <ProviderStatCard
          title="Rating"
          value={(worker?.rating ?? 0).toFixed(1)}
          hint={`${worker?.ratingCount ?? 0} reviews`}
          icon={Star}
        />
        <ProviderStatCard
          title="Response Rate"
          value={`${responseRate}%`}
          hint="Computed from request activity"
          icon={BriefcaseBusiness}
        />
        <ProviderStatCard
          title="Cancellation Rate"
          value={`${cancellationRate}%`}
          hint="Computed from resolved jobs"
          icon={BriefcaseBusiness}
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Incoming Job Requests</h2>
          <ProviderStatusPill status={isOnline ? "online" : "offline"} />
        </div>
        <AnimatePresence mode="popLayout">
          {incomingJobs.length ? (
            <div className="grid gap-3">
              {incomingJobs.map((job) => (
                <ProviderJobCard
                  key={job.id}
                  job={job}
                  onAccept={handleAcceptJob}
                  onReject={handleDeclineJob}
                  onExpire={handleDeclineJob}
                  onOpen={(id) => {
                    const source = incomingJobs.find((entry) => entry.id === id);
                    const targetId = source?.bookingId ?? id;
                    window.location.href = `/provider/job/${targetId}`;
                  }}
                />
              ))}
            </div>
          ) : (
            <ProviderEmptyState
              title="No incoming requests"
              desc="New customer requests will appear here."
            />
          )}
        </AnimatePresence>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Active Jobs</h2>
          <Link href="/provider/jobs" className="text-sm font-medium underline">
            View all
          </Link>
        </div>
        {active.length ? (
          <div className="grid gap-3">
            {active.slice(0, 2).map((job) => (
                <ProviderJobCard
                  key={job.id}
                  job={job}
                  onStart={handleAdvanceJob}
                  onComplete={handleCompleteJob}
                  onMessage={(id) => {
                    const source = active.find((entry) => entry.id === id);
                    const targetBookingId = source?.bookingId;
                    if (!targetBookingId) return;
                    window.location.href = `/chat/${targetBookingId}`;
                  }}
                  onOpen={(id) => {
                    const source = active.find((entry) => entry.id === id);
                    const targetId = source?.id ?? id;
                    window.location.href = `/provider/job/${targetId}`;
                  }}
                />
            ))}
          </div>
        ) : (
          <ProviderEmptyState title="No active jobs" desc="Accepted jobs will be listed here." />
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-lg font-semibold">Quick Links</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {providerQuickLinks.map((link) => (
            <Button key={link.href} asChild variant="outline" className="justify-start">
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-lg font-semibold">Recent Jobs</h2>
        {recentJobs.length ? (
          <div className="mt-3 space-y-2">
            {recentJobs.map((item) => (
              <Link
                key={item.id}
                href={`/provider/job/${item.id}`}
                className="block rounded-lg border border-border px-3 py-2 text-sm"
              >
                <p className="font-medium">{item.customerName}</p>
                <p className="text-xs text-muted-foreground">
                  {item.service} • {item.status} • {item.scheduledTime?.toDate?.().toLocaleString?.() ?? "-"}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No recent jobs yet.</p>
        )}
      </section>
    </div>
  );
}
