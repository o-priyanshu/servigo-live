"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { getCustomerRatingAggregate, getCustomerRatings } from "@/services/firebase/rating";
import type { CustomerRatingData, Rating } from "@/services/firebase/types";
import { calculateCriteriaAverages } from "@/utils/ratingCalculations";

interface CustomerRatingDisplayProps {
  customerId: string;
}

function formatRelativeTime(value?: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (!date || Number.isNaN(date.getTime())) return "Recently";
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  return `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? "s" : ""} ago`;
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

export default function CustomerRatingDisplay({ customerId }: CustomerRatingDisplayProps) {
  const [aggregate, setAggregate] = useState<CustomerRatingData | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [summary, rows] = await Promise.all([
          getCustomerRatingAggregate(customerId),
          getCustomerRatings(customerId, 6),
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
  }, [customerId]);

  if (loading) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">Loading customer rating...</p>
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

  const criteria = {
    behavior: 0,
    paymentPromptness: 0,
    accessibility: 0,
    communication: 0,
    ...(calculateCriteriaAverages(ratings) as Partial<{
      behavior: number;
      paymentPromptness: number;
      accessibility: number;
      communication: number;
    }>),
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-2xl font-bold text-foreground">
            Customer Rating: {(aggregate?.averageRating ?? 0).toFixed(1)}
            <Star size={18} className="fill-amber-400 text-amber-400" />
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            From {aggregate?.totalRatings ?? 0} worker
            {(aggregate?.totalRatings ?? 0) === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
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

      <div className="mt-5 space-y-3">
        {ratings.length > 0 ? (
          ratings.map((rating) => (
            <article key={rating.id} className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-foreground">Worker feedback</p>
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
            No customer ratings yet.
          </p>
        )}
      </div>
    </section>
  );
}
