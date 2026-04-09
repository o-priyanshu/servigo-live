"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { raiseDispute, uploadDisputeEvidence } from "@/services/firebase/booking";

interface BookingMeta {
  providerId: string;
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

export default function ReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const bookingId = params?.id ?? "";

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
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

  async function handleSubmit() {
    try {
      setSubmitting(true);
      setError("");
      const res = await fetch(`/api/bookings/${bookingId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
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

  const disputeWindowLabel = `${Math.floor(remainingMs / (1000 * 60 * 60))}h ${Math.floor(
    (remainingMs % (1000 * 60 * 60)) / (1000 * 60)
  )}m`;

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-4">
        <section className="rounded-2xl border border-border bg-card p-6">
          <h1 className="text-2xl font-bold text-foreground">Write Review</h1>
          <p className="mt-1 text-sm text-muted-foreground">Booking ID: {bookingId}</p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading review state...</p>
          ) : existing ? (
            <div>
              <p className="text-sm text-muted-foreground">You already submitted a review.</p>
              <p className="mt-2 text-base font-medium text-foreground">Rating: {existing.rating}/5</p>
              <p className="mt-1 text-sm text-muted-foreground">{existing.comment}</p>
              <Link href={`/bookings/${bookingId}`} className="mt-3 inline-flex text-sm font-medium text-emerald-700">
                Back to booking
              </Link>
            </div>
          ) : (
            <>
              <div>
                <p className="text-sm font-medium text-foreground">Rating</p>
                <div className="mt-2 flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      className="rounded-md p-1"
                    >
                      <Star
                        size={22}
                        className={
                          value <= rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground"
                        }
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-foreground">Comment</p>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Share your experience..."
                />
              </div>
              {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
              <Button
                onClick={handleSubmit}
                disabled={submitting || comment.trim().length < 3}
                className="mt-4"
              >
                {submitting ? "Submitting..." : "Submit Review"}
              </Button>
            </>
          )}
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
