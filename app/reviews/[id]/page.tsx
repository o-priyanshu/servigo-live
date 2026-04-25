"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import StarInput from "@/components/rating/StarInput";
import CriteriaSlider from "@/components/rating/CriteriaSlider";
import {
  NEGATIVE_WORKER_TAGS,
  POSITIVE_WORKER_TAGS,
} from "@/constants/ratingTags";
import { useAuth } from "@/context/AuthContext";

interface BookingMeta {
  providerId: string;
  providerName: string;
  providerPhoto: string;
  serviceCategory: string;
  amount: number;
  address: string;
  status: string;
  createdAt: string;
  completedAt: string;
}

function asIso(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const row = value as { _seconds?: number; seconds?: number };
    const seconds = typeof row._seconds === "number" ? row._seconds : row.seconds;
    if (typeof seconds === "number") return new Date(seconds * 1000).toISOString();
  }
  return "";
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "W";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export default function ReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const bookingId = params?.id ?? "";

  const [overallRating, setOverallRating] = useState(5);
  const [punctuality, setPunctuality] = useState(5);
  const [quality, setQuality] = useState(5);
  const [behavior, setBehavior] = useState(5);
  const [cleanliness, setCleanliness] = useState(5);
  const [valueForMoney, setValueForMoney] = useState(5);
  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [existing, setExisting] = useState<{ rating: number; comment: string } | null>(null);
  const [booking, setBooking] = useState<BookingMeta | null>(null);
  const [disputeReason, setDisputeReason] = useState("bad_work");
  const [disputeDetail, setDisputeDetail] = useState("");
  const [disputeFiles, setDisputeFiles] = useState<File[]>([]);
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeMessage, setDisputeMessage] = useState("");
  const [remainingMs, setRemainingMs] = useState(0);

  const tagOptions = useMemo(
    () => (overallRating >= 4 ? POSITIVE_WORKER_TAGS : NEGATIVE_WORKER_TAGS),
    [overallRating]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/bookings/${bookingId}/review`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? "Failed to load review");

        if (!cancelled && data.review) {
          setExisting({ rating: Number(data.review.rating ?? 0), comment: String(data.review.comment ?? "") });
        }

        const bookingRes = await fetch(`/api/bookings/${bookingId}`, { cache: "no-store" });
        const bookingData = await bookingRes.json().catch(() => ({}));
        if (bookingRes.ok && !cancelled && bookingData.booking) {
          setBooking({
            providerId: String(bookingData.booking.providerId ?? ""),
            providerName: String(bookingData.booking.providerName ?? "Provider"),
            providerPhoto: String(bookingData.booking.providerPhoto ?? ""),
            serviceCategory: String(bookingData.booking.serviceCategory ?? ""),
            amount: Number(bookingData.booking.amount ?? 0),
            address: String(bookingData.booking.address ?? ""),
            status: String(bookingData.booking.status ?? "pending"),
            createdAt: asIso(bookingData.booking.createdAt),
            completedAt: asIso(bookingData.booking.completedAt),
          });
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load review");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  useEffect(() => {
    if (!booking) return;
    const base = booking.completedAt || booking.createdAt;
    const baseTs = new Date(base).getTime();
    if (!Number.isFinite(baseTs)) return;
    const deadline = baseTs + 24 * 60 * 60 * 1000;

    const update = () => {
      setRemainingMs(Math.max(0, deadline - Date.now()));
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [booking]);

  useEffect(() => {
    if (!booking) return;
    if (existing) return;
    if (booking.status !== "completed") return;
    setSelectedTags([]);
  }, [booking, existing]);

  async function handleSubmit() {
    try {
      setSubmitting(true);
      setError("");
      const res = await fetch(`/api/bookings/${bookingId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: overallRating,
          overallRating,
          comment,
          reviewText: comment,
          criteriaRatings: {
            punctuality,
            quality,
            behavior,
            cleanliness,
            valueForMoney,
          },
          tags: selectedTags,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to submit review");
      router.push(`/bookings/${bookingId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDisputeSubmit() {
    if (!booking) return;
    if (!user?.uid) {
      setDisputeMessage("Please sign in again to raise a dispute.");
      return;
    }
    if (remainingMs <= 0) {
      setDisputeMessage("Dispute window has closed.");
      return;
    }
    if (disputeDetail.trim().length < 10) {
      setDisputeMessage("Please provide at least 10 characters in issue details.");
      return;
    }

    try {
      setDisputeSubmitting(true);
      setDisputeMessage("");
      const { raiseDispute, uploadDisputeEvidence } = await import("@/services/firebase/booking");
      const evidenceUrls: string[] = [];
      for (const file of disputeFiles.slice(0, 4)) {
        const url = await uploadDisputeEvidence(bookingId, file, user.uid);
        evidenceUrls.push(url);
      }
      const reasonText = `${disputeReason.replaceAll("_", " ")}: ${disputeDetail.trim()}`;
      await raiseDispute(bookingId, reasonText, evidenceUrls);
      setDisputeMessage("Issue reported. Our team will review and contact you.");
      setDisputeDetail("");
      setDisputeFiles([]);
    } catch (e: unknown) {
      setDisputeMessage(e instanceof Error ? e.message : "Failed to raise dispute");
    } finally {
      setDisputeSubmitting(false);
    }
  }

  function handleReceiptDownload() {
    if (!booking) return;
    const html = `
      <html>
        <head><title>ServiGo Receipt</title></head>
        <body style="font-family: Arial, sans-serif; padding: 24px;">
          <h2>ServiGo Receipt</h2>
          <p><strong>Booking ID:</strong> ${bookingId}</p>
          <p><strong>Service:</strong> ${booking.serviceCategory.replaceAll("_", " ")}</p>
          <p><strong>Amount:</strong> Rs ${booking.amount}</p>
          <p><strong>Status:</strong> ${booking.status}</p>
          <p><strong>Address:</strong> ${booking.address}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        </body>
      </html>
    `;
    const receiptWindow = window.open("", "_blank", "width=640,height=800");
    if (!receiptWindow) return;
    receiptWindow.document.write(html);
    receiptWindow.document.close();
    receiptWindow.focus();
    receiptWindow.print();
  }

  function toggleTag(tag: string) {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
    );
  }

  const disputeWindowLabel = `${Math.floor(remainingMs / (1000 * 60 * 60))}h ${Math.floor(
    (remainingMs % (1000 * 60 * 60)) / (1000 * 60)
  )}m`;

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-4">
        <section className="rounded-2xl border border-border bg-card p-6">
          <h1 className="text-2xl font-bold text-foreground">Write Review</h1>
          <p className="mt-1 text-sm text-muted-foreground">Booking ID: {bookingId}</p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-0 shadow-sm">
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div className="flex items-center gap-3">
              {booking?.providerPhoto ? (
                <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-border/70">
                  <Image src={booking.providerPhoto} alt={booking.providerName} fill sizes="48px" className="object-cover" />
                </div>
              ) : (
                <div className="grid h-12 w-12 place-items-center rounded-xl border border-border/70 bg-muted text-sm font-semibold text-muted-foreground">
                  {getInitials(booking?.providerName ?? "Worker")}
                </div>
              )}
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Rate {booking?.providerName ?? "Worker"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {booking?.serviceCategory ? booking.serviceCategory.replaceAll("_", " ") : "Service"}
                </p>
              </div>
            </div>
            <Link
              href={`/bookings/${bookingId}`}
              className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close review page"
            >
              <X size={18} />
            </Link>
          </div>

          <div className="max-h-[80vh] overflow-y-auto px-5 py-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading review state...</p>
            ) : existing ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">You already submitted a review.</p>
                <p className="text-base font-medium text-foreground">Rating: {existing.rating}/5</p>
                <p className="text-sm text-muted-foreground">{existing.comment}</p>
                <Link href={`/bookings/${bookingId}`} className="inline-flex text-sm font-medium text-emerald-700">
                  Back to booking
                </Link>
              </div>
            ) : (
              <div className="space-y-5">
                <StarInput value={overallRating} onChange={setOverallRating} size="lg" labels />

                <div className="grid gap-4 sm:grid-cols-2">
                  <CriteriaSlider label="Punctuality" value={punctuality} onChange={setPunctuality} />
                  <CriteriaSlider label="Quality" value={quality} onChange={setQuality} />
                  <CriteriaSlider label="Behavior" value={behavior} onChange={setBehavior} />
                  <CriteriaSlider label="Cleanliness" value={cleanliness} onChange={setCleanliness} />
                  <CriteriaSlider
                    label="Value for Money"
                    value={valueForMoney}
                    onChange={setValueForMoney}
                    description="How fair was the final price?"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Write a review</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Share what went well..."
                  />
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {tagOptions.map((tag) => {
                      const active = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`rounded-full border px-3 py-1 text-sm transition ${
                            active
                              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                              : "border-border bg-background text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {error ? <p className="text-sm text-rose-600">{error}</p> : null}

                <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
                  <Button variant="outline" onClick={() => router.push(`/bookings/${bookingId}`)} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={submitting || overallRating < 1}>
                    {submitting ? "Submitting..." : "Submit Rating"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Post-Booking</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Button variant="outline" onClick={handleReceiptDownload} disabled={!booking}>
              Download Receipt
            </Button>
            {booking?.providerId ? (
              <Link
                href={`/provider/${booking.providerId}`}
                className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium hover:bg-muted"
              >
                Rebook Worker
              </Link>
            ) : (
              <div className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm text-muted-foreground">
                Rebook unavailable
              </div>
            )}
          </div>

          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Dispute window: {remainingMs > 0 ? disputeWindowLabel : "Closed"}
          </div>

          {remainingMs > 0 ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium text-foreground">Report an issue</p>
              <select
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="bad_work">Bad work quality</option>
                <option value="damaged_item">Damaged item</option>
                <option value="misbehavior">Misbehavior</option>
                <option value="theft">Theft</option>
                <option value="other">Other</option>
              </select>
              <textarea
                value={disputeDetail}
                onChange={(e) => setDisputeDetail(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Explain what happened..."
              />
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setDisputeFiles(Array.from(e.target.files ?? []))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              {disputeFiles.length > 0 ? (
                <p className="text-xs text-muted-foreground">{disputeFiles.length} evidence file(s) selected.</p>
              ) : null}
              <Button
                onClick={handleDisputeSubmit}
                disabled={disputeSubmitting || disputeDetail.trim().length < 10}
              >
                {disputeSubmitting ? "Submitting issue..." : "Submit Issue"}
              </Button>
              {disputeMessage ? <p className="text-sm text-muted-foreground">{disputeMessage}</p> : null}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
