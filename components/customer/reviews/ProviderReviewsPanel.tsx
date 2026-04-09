"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Star } from "lucide-react";
import { getCustomerProfileImage } from "@/lib/profile-image";

export interface ProviderReviewItem {
  id: string;
  customerId?: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAtIso: string | null;
  serviceLabel?: string;
}

interface ProviderReviewsPanelProps {
  averageRating: number;
  totalReviewCount: number;
  reviews: ProviderReviewItem[];
}

type SortMode = "most_recent" | "highest" | "lowest";

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "Recently";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Recently";

  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? "s" : ""} ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${diffDays >= 60 ? "s" : ""} ago`;
  return `${Math.floor(diffDays / 365)} year${diffDays >= 730 ? "s" : ""} ago`;
}

function renderStars(rating: number, size: "sm" | "md" = "sm") {
  const pixel = size === "sm" ? 14 : 18;
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }).map((_, idx) => {
        const starNumber = idx + 1;
        const active = starNumber <= Math.round(rating);
        return (
          <Star
            key={starNumber}
            size={pixel}
            className={active ? "fill-amber-400 text-amber-400" : "text-zinc-300"}
          />
        );
      })}
    </div>
  );
}

export default function ProviderReviewsPanel({
  averageRating,
  totalReviewCount,
  reviews,
}: ProviderReviewsPanelProps) {
  const [sortMode, setSortMode] = useState<SortMode>("most_recent");
  const [visibleCount, setVisibleCount] = useState(4);

  const sortedReviews = useMemo(() => {
    const arr = [...reviews];
    if (sortMode === "highest") {
      arr.sort((a, b) => b.rating - a.rating);
      return arr;
    }
    if (sortMode === "lowest") {
      arr.sort((a, b) => a.rating - b.rating);
      return arr;
    }
    arr.sort((a, b) => {
      const aTime = a.createdAtIso ? new Date(a.createdAtIso).getTime() : 0;
      const bTime = b.createdAtIso ? new Date(b.createdAtIso).getTime() : 0;
      return bTime - aTime;
    });
    return arr;
  }, [reviews, sortMode]);

  const visibleReviews = useMemo(
    () => sortedReviews.slice(0, Math.max(visibleCount, 4)),
    [sortedReviews, visibleCount]
  );

  const distribution = useMemo(() => {
    const base = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const review of reviews) {
      const bucket = Math.min(5, Math.max(1, Math.round(review.rating))) as 1 | 2 | 3 | 4 | 5;
      base[bucket] += 1;
    }
    return base;
  }, [reviews]);

  const reviewBase = reviews.length > 0 ? reviews.length : 1;
  const score = Number.isFinite(averageRating) ? averageRating : 0;

  return (
    <article className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-2xl font-semibold">Customer Reviews</h2>
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          aria-label="Sort reviews"
        >
          <option value="most_recent">Most Recent</option>
          <option value="highest">Highest Rating</option>
          <option value="lowest">Lowest Rating</option>
        </select>
      </div>

      <div className="mt-5 rounded-xl border border-border/70 bg-muted/30 p-4">
        <div className="grid gap-5 md:grid-cols-[220px_1fr]">
          <div className="text-center md:text-left">
            <p className="text-5xl font-bold text-foreground">{score.toFixed(1)}</p>
            <div className="mt-2">{renderStars(score, "md")}</div>
            <p className="mt-2 text-sm text-muted-foreground">
              {Math.max(totalReviewCount, reviews.length)} review
              {Math.max(totalReviewCount, reviews.length) === 1 ? "" : "s"}
            </p>
          </div>

          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = distribution[star as 1 | 2 | 3 | 4 | 5];
              const width = Math.max(2, (count / reviewBase) * 100);
              return (
                <div key={star} className="grid grid-cols-[28px_1fr_28px] items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{star}★</span>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${width}%` }} />
                  </div>
                  <span className="text-right text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {visibleReviews.length > 0 ? (
          visibleReviews.map((review) => {
            const avatar = getCustomerProfileImage(
              review.customerId ?? review.id,
              review.customerName
            );
            return (
              <div key={review.id} className="rounded-xl border border-border p-4">
                <div className="flex items-start gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-border/60">
                    <Image
                      src={avatar}
                      alt={review.customerName}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-foreground">{review.customerName}</p>
                    <div className="mt-0.5 inline-flex items-center gap-2">
                      {renderStars(review.rating)}
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeTime(review.createdAtIso)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{review.comment}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-border bg-muted px-2 py-1 text-xs text-muted-foreground">
                        Verified Booking
                      </span>
                      {review.serviceLabel ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                          {review.serviceLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No reviews yet. Completed bookings will appear here automatically.
          </div>
        )}
      </div>

      {visibleCount < sortedReviews.length ? (
        <button
          type="button"
          onClick={() => setVisibleCount((prev) => prev + 4)}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-5 text-sm font-medium hover:bg-muted/70"
        >
          Load More Reviews
        </button>
      ) : null}
    </article>
  );
}
