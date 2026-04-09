"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { MapPin, MessageCircle, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ProviderSectionHeader from "@/components/provider/ProviderSectionHeader";
import ProviderStatusPill from "@/components/provider/ProviderStatusPill";
import { formatDateTime, formatInr } from "@/lib/provider/format";
import type { JobStatus } from "@/lib/types/provider";
import { getJobDetails } from "@/services/firebase/workerJobs";
import type { WorkerJob } from "@/services/firebase/types";
import { useWorkerStore } from "@/store/workerStore";

const timelineOrder: JobStatus[] = ["accepted", "on_the_way", "in_progress", "completed"];

function toIso(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

function uiStatusFromWorker(status: WorkerJob["status"]): JobStatus {
  if (status === "on_way" || status === "arrived") return "on_the_way";
  if (status === "working") return "in_progress";
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  return "accepted";
}

export default function ProviderJobDetailsPage() {
  const params = useParams<{ id: string }>();
  const jobId = params?.id ?? "";
  const updateJobStatus = useWorkerStore((state) => state.updateJobStatus);
  const uploadEntryPhoto = useWorkerStore((state) => state.uploadEntryPhoto);
  const uploadExitPhoto = useWorkerStore((state) => state.uploadExitPhoto);
  const updateLocation = useWorkerStore((state) => state.updateLocation);

  const [job, setJob] = useState<WorkerJob | null>(null);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [entryFile, setEntryFile] = useState<File | null>(null);
  const [exitFile, setExitFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number; at: number } | null>(
    null
  );

  useEffect(() => {
    if (!jobId) return;
    void (async () => {
      const details = await getJobDetails(jobId);
      setJob(details);
      setNotes(details?.notes ?? "");
    })();
  }, [jobId]);

  useEffect(() => {
    if (
      !job ||
      (job.status !== "accepted" &&
        job.status !== "on_way" &&
        job.status !== "arrived" &&
        job.status !== "working") ||
      typeof window === "undefined" ||
      !("geolocation" in navigator)
    ) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          at: Date.now(),
        };
        setLiveLocation(next);
        void updateLocation(next.lat, next.lng);
      },
      () => {
        // Keep page usable even if location permission is denied.
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 15_000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [job, updateLocation]);

  const status = uiStatusFromWorker(job?.status ?? "accepted");
  const dt = formatDateTime(toIso(job?.scheduledTime));

  const activeIndex = useMemo(() => timelineOrder.indexOf(status), [status]);
  const mapDestination =
    typeof job?.customerAddress?.lat === "number" && typeof job?.customerAddress?.lng === "number"
      ? `https://www.google.com/maps/dir/?api=1&destination=${job.customerAddress.lat},${job.customerAddress.lng}`
      : "";
  const statusHistory = useMemo(() => {
    return [...(job?.statusHistory ?? [])].sort(
      (a, b) => (a.at?.toMillis?.() ?? 0) - (b.at?.toMillis?.() ?? 0)
    );
  }, [job?.statusHistory]);

  if (!job) {
    return (
      <div className="space-y-6">
        <ProviderSectionHeader
          eyebrow="Job Details"
          title="Job not found"
          subtitle="This job may have been completed or removed."
        />
        <Button asChild variant="outline" className="h-10 w-fit">
          <Link href="/provider/jobs">Back to Jobs</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProviderSectionHeader
        eyebrow="Job Details"
        title={job.service}
        subtitle={`${job.customerName} • ${dt.date} ${dt.time}`}
        right={<ProviderStatusPill status={status} />}
      />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div>
            <h2 className="text-lg font-semibold">Customer Info</h2>
            <p className="mt-1 text-sm">{job.customerName}</p>
            <p className="text-sm text-muted-foreground">{job.customerPhone}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Address</h2>
            <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin size={14} /> {job.customerAddress?.fullAddress}
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Issue Description</h2>
            <p className="mt-1 text-sm text-muted-foreground">{job.description}</p>
          </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button className="h-10" onClick={() => alert(`Call: ${job.customerPhone}`)}>
                <Phone size={15} className="mr-1" /> Call Customer
              </Button>
              <Button asChild variant="outline" className="h-10">
                <Link href={`/chat/${job.bookingId}`}>
                  <MessageCircle size={15} className="mr-1" /> Message
                </Link>
              </Button>
            </div>
        </section>

        <section className="space-y-4">
          <article className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">Map Preview</h2>
            <div className="mt-3 space-y-2 rounded-lg border border-dashed border-border bg-muted p-3 text-sm text-muted-foreground">
              <p>Destination: {job.customerAddress?.fullAddress || "Not available"}</p>
              <p>
                Live location:{" "}
                {liveLocation
                  ? `${liveLocation.lat.toFixed(5)}, ${liveLocation.lng.toFixed(5)}`
                  : "Waiting for GPS permission"}
              </p>
              <p>Last update: {liveLocation ? new Date(liveLocation.at).toLocaleTimeString() : "-"}</p>
              {mapDestination ? (
                <a href={mapDestination} target="_blank" rel="noreferrer" className="inline-block underline">
                  Open Directions in Maps
                </a>
              ) : null}
            </div>
          </article>

          <article className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">Status Timeline</h2>
            <ol className="mt-3 space-y-2">
              {timelineOrder.map((step, idx) => (
                <li key={step} className="flex items-center gap-2 text-sm capitalize">
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-full ${
                      activeIndex >= idx ? "bg-emerald-500" : "bg-muted-foreground/40"
                    }`}
                  />
                  <span>{step.replaceAll("_", " ")}</span>
                  <span className="text-xs text-muted-foreground">
                    {statusHistory.find((item) =>
                      step === "on_the_way"
                        ? item.status === "on_way" || item.status === "arrived"
                        : step === "in_progress"
                        ? item.status === "working"
                        : item.status === step.replace("on_the_way", "on_way").replace("in_progress", "working")
                    )?.at?.toDate?.().toLocaleString?.() ?? ""}
                  </span>
                </li>
              ))}
            </ol>
          </article>

          <article className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Payment estimate</p>
            <p className="text-2xl font-bold">{formatInr(job.price?.base ?? 0)}</p>
            <div className="mt-3 flex gap-2">
              <Button
                className="h-10"
                disabled={job.status === "completed" || job.status === "cancelled"}
                onClick={() => {
                  const next =
                    job.status === "accepted"
                      ? "on_way"
                      : job.status === "on_way"
                      ? "arrived"
                      : job.status === "arrived"
                      ? "working"
                      : job.status === "working"
                      ? "completed"
                      : job.status;

                  void updateJobStatus(job.id, next, {
                    bookingId: job.bookingId,
                    workerId: job.workerId,
                  });
                  setJob((prev) => (prev ? { ...prev, status: next } : prev));
                }}
              >
                Advance Status
              </Button>
              <Button asChild variant="outline" className="h-10">
                <Link href="/provider/jobs">Back to Jobs</Link>
              </Button>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">Job Notes</p>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Add notes about this job."
              />
              <Button
                variant="outline"
                className="h-10"
                disabled={savingNotes}
                onClick={() => {
                  setSavingNotes(true);
                  void updateJobStatus(job.id, job.status, {
                    bookingId: job.bookingId,
                    workerId: job.workerId,
                    notes,
                  }).finally(() => setSavingNotes(false));
                }}
              >
                {savingNotes ? "Saving..." : "Save Notes"}
              </Button>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">Entry / Exit Photos</p>
              <Input type="file" accept="image/*" onChange={(e) => setEntryFile(e.target.files?.[0] ?? null)} />
              <Input type="file" accept="image/*" onChange={(e) => setExitFile(e.target.files?.[0] ?? null)} />
              <Button
                variant="outline"
                className="h-10"
                disabled={uploading || (!entryFile && !exitFile)}
                onClick={() => {
                  setUploading(true);
                  void (async () => {
                    let nextEntry = job.entryPhoto;
                    let nextExit = job.exitPhoto;

                    if (entryFile) nextEntry = await uploadEntryPhoto(job.id, entryFile);
                    if (exitFile) nextExit = await uploadExitPhoto(job.id, exitFile);

                    setJob((prev) =>
                      prev
                        ? {
                            ...prev,
                            entryPhoto: nextEntry,
                            exitPhoto: nextExit,
                          }
                        : prev
                    );
                  })().finally(() => setUploading(false));
                }}
              >
                {uploading ? "Uploading..." : "Upload Photos"}
              </Button>
              {job.entryPhoto ? (
                <a href={job.entryPhoto} target="_blank" rel="noreferrer" className="block text-xs underline">
                  View entry photo
                </a>
              ) : null}
              {job.exitPhoto ? (
                <a href={job.exitPhoto} target="_blank" rel="noreferrer" className="block text-xs underline">
                  View exit photo
                </a>
              ) : null}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}

