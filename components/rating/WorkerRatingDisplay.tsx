"use client";

import { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { getWorkerRatingAggregate, getWorkerRatings } from "@/services/firebase/rating";
import type { Rating, WorkerRatingData } from "@/services/firebase/types";
import { calculateCriteriaAverages, calculateDistribution } from "@/utils/ratingCalculations";

interface WorkerRatingDisplayProps {
  workerId: string;
}

function formatRelativeTime(value?: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (!date || Number.isNaN(date.getTime())) return "Recently";
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? "s" : ""} ago`;
  return `${Math.floor(diffDays / 30)} month${diffDays >= 60 ? "s" : ""} ago`;
}

function toDateValue(value: unknown): Date | undefined {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  if (value && typeof value === "object" && "toDate" in value) {
    const candidate = value as { toDate?: () => Date };
    if (typeof candidate.toDate === "function") return candidate.toDate();
  }
  return undefined;
}

function scoreLabel(score: number): string {
  if (score >= 4.5) return "Excellent";
  if (score >= 4) return "Great";
  if (score >= 3) return "Okay";
  return "Needs work";
}

export default function WorkerRatingDisplay({ workerId }: WorkerRatingDisplayProps) {
  const [aggregate, setAggregate] = useState<WorkerRatingData | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [summary, rows] = await Promise.all([
          getWorkerRatingAggregate(workerId),
          getWorkerRatings(workerId, 6),
        ]);
        if (cancelled) return;
        setAggregate(summary);
        setRatings(rows);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load ratings.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workerId]);

  const distribution = useMemo(() => calculateDistribution(ratings), [ratings]);

  const criteria = useMemo(
    () => ({
      punctuality: 0,
      quality: 0,
      behavior: 0,
      cleanliness: 0,
      valueForMoney: 0,
      ...(calculateCriteriaAverages(ratings) as Partial<{
        punctuality: number;
        quality: number;
        behavior: number;
        cleanliness: number;
        valueForMoney: number;
      }>),
    }),
    [ratings]
  );

  if (loading) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">Loading ratings...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-rose-600">{error}</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-3xl font-bold text-foreground">
            <Star size={20} className="fill-amber-400 text-amber-400" />
            {(aggregate?.averageRating ?? 0).toFixed(1)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Based on {aggregate?.totalRatings ?? 0} review
            {(aggregate?.totalRatings ?? 0) === 1 ? "" : "s"} | {scoreLabel(aggregate?.averageRating ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-right">
          <p className="text-xs text-muted-foreground">Recent average</p>
          <p className="text-sm font-semibold text-foreground">
            {scoreLabel(aggregate?.averageRating ?? 0)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-[180px_1fr]">
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = distribution[star as 1 | 2 | 3 | 4 | 5] ?? 0;
            const width = Math.max(2, (count / Math.max(1, aggregate?.totalRatings ?? 1)) * 100);
            return (
              <div key={star} className="grid grid-cols-[30px_1fr_28px] items-center gap-2 text-sm">
                <span className="text-muted-foreground">{star} stars</span>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${width}%` }} />
                </div>
                <span className="text-right text-muted-foreground">{count}</span>
              </div>
            );
          })}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(criteria).map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between text-sm">
                <p className="font-medium text-foreground capitalize">{label.replaceAll("_", " ")}</p>
                <p className="text-muted-foreground">{Number(value).toFixed(1)}</p>
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${(Number(value) / 5) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {ratings.length > 0 ? (
          ratings.map((rating) => (
            <article key={rating.id} className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-foreground">
                  {rating.raterType === "customer" ? "Customer" : "Worker"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatRelativeTime(toDateValue(rating.createdAt))}
                </p>
              </div>
              <div className="mt-2 inline-flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    size={14}
                    className={
                      index + 1 <= Math.round(rating.overallRating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-zinc-300"
                    }
                  />
                ))}
              </div>
              {rating.reviewText ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {rating.reviewText}
                </p>
              ) : null}
            </article>
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            No ratings yet.
          </p>
        )}
      </div>
    </section>
  );
}
