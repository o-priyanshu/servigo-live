"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, IndianRupee, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import ProviderStatusPill from "@/components/provider/ProviderStatusPill";
import { formatDateTime, formatInr } from "@/lib/provider/format";
import type { Job } from "@/lib/types/provider";

interface ProviderJobCardProps {
  job: Job;
  onAccept?: (id: string) => void | Promise<void>;
  onReject?: (id: string) => void | Promise<void>;
  onStart?: (id: string) => void | Promise<void>;
  onComplete?: (id: string) => void | Promise<void>;
  onOpen?: (id: string) => void | Promise<void>;
  onExpire?: (id: string) => void | Promise<void>;
  onMessage?: (id: string) => void | Promise<void>;
}

export default function ProviderJobCard({
  job,
  onAccept,
  onReject,
  onStart,
  onComplete,
  onOpen,
  onExpire,
  onMessage,
}: ProviderJobCardProps) {
  const dt = formatDateTime(job.scheduledAtIso);
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    if (!job.expiresAtMs || job.status !== "incoming") return;

    const tick = () => {
      setRemainingMs(Math.max(0, job.expiresAtMs! - Date.now()));
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [job.expiresAtMs, job.status]);

  useEffect(() => {
    if (job.status !== "incoming" || !job.expiresAtMs) return;
    if (Date.now() < job.expiresAtMs) return;
    if (actionBusy) return;
    void onExpire?.(job.id);
  }, [actionBusy, job.expiresAtMs, job.id, job.status, onExpire]);

  const countdown = useMemo(() => {
    if (!job.expiresAtMs || job.status !== "incoming") return null;
    const sec = Math.floor(remainingMs / 1000);
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  }, [job.expiresAtMs, job.status, remainingMs]);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-xl font-semibold">{job.customerName}</h3>
          <p className="text-sm text-muted-foreground">{job.serviceType}</p>
        </div>
        <ProviderStatusPill status={job.status} />
      </div>

      <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
        <p className="inline-flex items-center gap-1">
          <MapPin size={14} /> {job.distanceKm.toFixed(1)} km
        </p>
        <p className="inline-flex items-center gap-1">
          <Calendar size={14} /> {dt.date} {dt.time}
        </p>
        <p className="inline-flex items-center gap-1">
          <IndianRupee size={14} /> {formatInr(job.paymentEstimateInr)}
        </p>
      </div>
      {typeof job.customerRating === "number" ? (
        <p className="mt-2 text-xs text-muted-foreground">Customer rating: {job.customerRating.toFixed(1)} / 5</p>
      ) : null}
      {countdown ? (
        <p className="mt-1 text-xs font-semibold text-amber-700">Auto-decline in {countdown}</p>
      ) : null}

      <p className="mt-3 text-sm">{job.description}</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {job.status === "incoming" ? (
          <>
            <Button
              className="h-10"
              disabled={actionBusy}
              onClick={() => {
                setActionBusy(true);
                void Promise.resolve(onAccept?.(job.id)).finally(() => {
                  setActionBusy(false);
                });
              }}
            >
              Accept
            </Button>
            <Button
              variant="outline"
              className="h-10"
              disabled={actionBusy}
              onClick={() => {
                setActionBusy(true);
                void Promise.resolve(onReject?.(job.id)).finally(() => {
                  setActionBusy(false);
                });
              }}
            >
              Reject
            </Button>
          </>
        ) : null}
        {job.status === "accepted" || job.status === "on_the_way" ? (
          <>
            <Button className="h-10" onClick={() => onStart?.(job.id)}>
              Start Job
            </Button>
            {job.canMessage ? (
              <Button variant="outline" className="h-10" onClick={() => onMessage?.(job.id)}>
                Message
              </Button>
            ) : (
              <Button variant="outline" className="h-10" onClick={() => onOpen?.(job.id)}>
                View Details
              </Button>
            )}
          </>
        ) : null}
        {job.status === "in_progress" ? (
          <>
            <Button className="h-10" onClick={() => onComplete?.(job.id)}>
              Mark Complete
            </Button>
            {job.canMessage ? (
              <Button variant="outline" className="h-10" onClick={() => onMessage?.(job.id)}>
                Message
              </Button>
            ) : (
              <Button variant="outline" className="h-10" onClick={() => onOpen?.(job.id)}>
                View Details
              </Button>
            )}
          </>
        ) : null}
        {job.status === "completed" || job.status === "cancelled" ? (
          <Button variant="outline" className="h-10 sm:col-span-2" onClick={() => onOpen?.(job.id)}>
            View Details
          </Button>
        ) : null}
      </div>
    </motion.article>
  );
}
