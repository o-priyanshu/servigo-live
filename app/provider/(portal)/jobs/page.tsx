"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import ProviderJobCard from "@/components/provider/ProviderJobCard";
import ProviderSectionHeader from "@/components/provider/ProviderSectionHeader";
import { ProviderEmptyState } from "@/components/provider/ProviderStates";
import type { Job } from "@/lib/types/provider";
import { useAuth } from "@/context/AuthContext";
import { getWorkerProfile } from "@/services/firebase/workerAuth";
import { getJobHistory } from "@/services/firebase/workerJobs";
import type { WorkerJob } from "@/services/firebase/types";
import { useWorkerStore } from "@/store/workerStore";

type JobsTab = "incoming" | "active" | "completed" | "cancelled";

const tabs: JobsTab[] = ["incoming", "active", "completed", "cancelled"];

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

function mapWorkerJobToUi(job: WorkerJob): Job {
  return {
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
  };
}

export default function ProviderJobsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { firebaseUser } = useAuth();
  const workerUid = firebaseUser?.uid ?? "";

  const tabQuery = (searchParams?.get("tab") as JobsTab | null) ?? "incoming";
  const activeTab = tabs.includes(tabQuery) ? tabQuery : "incoming";

  const pendingJobs = useWorkerStore((state) => state.pendingJobs);
  const activeJobs = useWorkerStore((state) => state.activeJobs);
  const setWorker = useWorkerStore((state) => state.setWorker);
  const fetchPendingJobs = useWorkerStore((state) => state.fetchPendingJobs);
  const fetchActiveJobs = useWorkerStore((state) => state.fetchActiveJobs);
  const subscribeToPendingJobs = useWorkerStore((state) => state.subscribeToPendingJobs);
  const acceptJob = useWorkerStore((state) => state.acceptJob);
  const declineJob = useWorkerStore((state) => state.declineJob);
  const updateJobStatus = useWorkerStore((state) => state.updateJobStatus);
  const requestJobCompletion = useWorkerStore((state) => state.requestJobCompletion);

  const [historyJobs, setHistoryJobs] = useState<WorkerJob[]>([]);

  const refreshHistory = useCallback(async () => {
    if (!workerUid) return;
    const history = await getJobHistory(workerUid, 50);
    setHistoryJobs(history);
  }, [workerUid]);

  useEffect(() => {
    if (!workerUid) return;
    let unsubPending: (() => void) | null = null;
    void (async () => {
      const profile = await getWorkerProfile(workerUid);
      if (profile) setWorker(profile);

      await Promise.all([refreshHistory(), fetchPendingJobs(), fetchActiveJobs()]);
      unsubPending = subscribeToPendingJobs();
    })();

    return () => {
      unsubPending?.();
    };
  }, [
    fetchActiveJobs,
    fetchPendingJobs,
    workerUid,
    refreshHistory,
    setWorker,
    subscribeToPendingJobs,
  ]);

  useEffect(() => {
    if (!workerUid) return;
    const timer = window.setInterval(() => {
      void Promise.all([refreshHistory(), fetchPendingJobs(), fetchActiveJobs()]);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [workerUid, refreshHistory, fetchPendingJobs, fetchActiveJobs]);

  const incoming = useMemo<Job[]>(
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

  const active = useMemo(() => activeJobs.map(mapWorkerJobToUi), [activeJobs]);
  const completed = useMemo(
    () => historyJobs.filter((job) => job.status === "completed").map(mapWorkerJobToUi),
    [historyJobs]
  );
  const cancelled = useMemo(
    () => historyJobs.filter((job) => job.status === "cancelled").map(mapWorkerJobToUi),
    [historyJobs]
  );

  const filtered =
    activeTab === "incoming"
      ? incoming
      : activeTab === "active"
      ? active
      : activeTab === "completed"
      ? completed
      : cancelled;

  async function handleAcceptJob(id: string) {
    try {
      await acceptJob(id);
      toast.success("✓ Job Accepted! Moving to Active Jobs.");
      await new Promise(r => setTimeout(r, 500));
      await Promise.all([refreshHistory(), fetchPendingJobs(), fetchActiveJobs()]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to accept job";
      toast.error(`Unable to accept: ${errorMsg}`);
      await Promise.all([refreshHistory(), fetchPendingJobs(), fetchActiveJobs()]);
    }
  }

  async function handleDeclineJob(id: string) {
    try {
      await declineJob(id);
      toast.success("✓ Job Declined");
      await new Promise(r => setTimeout(r, 500));
      await Promise.all([refreshHistory(), fetchPendingJobs(), fetchActiveJobs()]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to decline job";
      toast.error(`Unable to decline: ${errorMsg}`);
      await Promise.all([refreshHistory(), fetchPendingJobs(), fetchActiveJobs()]);
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
      
      const statusLabels: Record<string, string> = {
        on_way: "On the Way",
        arrived: "Arrived",
        working: "Started Work",
      };
      
      await updateJobStatus(id, nextStatus, {
        bookingId: source?.bookingId,
        workerId: source?.workerId,
      });
      toast.success(`✓ ${statusLabels[nextStatus] || "Status Updated"}`);
      await Promise.all([refreshHistory(), fetchPendingJobs(), fetchActiveJobs()]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to update job";
      toast.error(`Failed: ${errorMsg}`);
    }
  }

  async function handleCompleteJob(id: string) {
    try {
      const source = activeJobs.find((entry) => entry.id === id);
      await requestJobCompletion(id, source?.bookingId ?? "");
      toast.success("✓ Completion request sent to customer");
      await Promise.all([refreshHistory(), fetchPendingJobs(), fetchActiveJobs()]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to request completion";
      toast.error(`Failed: ${errorMsg}`);
    }
  }

  function setTab(tab: JobsTab) {
    router.push(`/provider/jobs?tab=${tab}`);
  }

  return (
    <div className="space-y-6">
      <ProviderSectionHeader
        eyebrow="Work Pipeline"
        title="Job Requests"
        subtitle="Track and update all service requests from incoming to completed."
      />

      <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-2 sm:grid-cols-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setTab(tab)}
            className={`rounded-lg px-3 py-2 text-sm font-medium capitalize ${
              activeTab === tab
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {filtered.length ? (
        <div className="grid gap-3">
          {filtered.map((job) => (
            <ProviderJobCard
              key={job.id}
              job={job}
              onAccept={handleAcceptJob}
              onReject={handleDeclineJob}
              onExpire={handleDeclineJob}
              onStart={handleAdvanceJob}
              onComplete={handleCompleteJob}
              onMessage={(id) => {
                const source = filtered.find((entry) => entry.id === id);
                const targetBookingId = source?.bookingId;
                if (!targetBookingId) return;
                router.push(`/chat/${targetBookingId}`);
              }}
              onOpen={(id) => {
                router.push(`/provider/job/${id}`);
              }}
            />
          ))}
        </div>
      ) : (
        <ProviderEmptyState
          title={`No ${activeTab} jobs`}
          desc="Jobs will automatically appear here based on live status updates."
        />
      )}
    </div>
  );
}
