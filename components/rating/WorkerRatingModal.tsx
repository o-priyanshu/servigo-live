"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import StarInput from "./StarInput";
import CriteriaSlider from "./CriteriaSlider";
import {
  NEGATIVE_CUSTOMER_TAGS,
  POSITIVE_CUSTOMER_TAGS,
} from "@/constants/ratingTags";
import type { SubmitRatingData } from "@/services/firebase/rating";

interface WorkerRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SubmitRatingData) => Promise<void> | void;
  customerName: string;
  bookingId: string;
  customerId: string;
}

export default function WorkerRatingModal({
  isOpen,
  onClose,
  onSubmit,
  customerName,
  bookingId,
  customerId,
}: WorkerRatingModalProps) {
  const [overallRating, setOverallRating] = useState(5);
  const [behavior, setBehavior] = useState(5);
  const [paymentPromptness, setPaymentPromptness] = useState(5);
  const [accessibility, setAccessibility] = useState(5);
  const [communication, setCommunication] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const tagOptions = useMemo(
    () => (overallRating >= 4 ? POSITIVE_CUSTOMER_TAGS : NEGATIVE_CUSTOMER_TAGS),
    [overallRating]
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setOverallRating(5);
    setBehavior(5);
    setPaymentPromptness(5);
    setAccessibility(5);
    setCommunication(5);
    setReviewText("");
    setSelectedTags([]);
    setError("");
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit() {
    try {
      setSubmitting(true);
      setError("");
      await onSubmit({
        bookingId,
        ratedId: customerId,
        ratedType: "customer",
        overallRating,
        criteriaRatings: {
          behavior,
          paymentPromptness,
          accessibility,
          communication,
        },
        reviewText,
        tags: selectedTags,
      });
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to submit rating.");
    } finally {
      setSubmitting(false);
    }
  }

  function toggleTag(tag: string) {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Rate Customer: {customerName}</h3>
            <p className="text-sm text-muted-foreground">Booking complete</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close rating modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto px-5 py-4">
          <div className="space-y-5">
            <div>
              <StarInput value={overallRating} onChange={setOverallRating} size="lg" labels />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <CriteriaSlider label="Behavior" value={behavior} onChange={setBehavior} />
              <CriteriaSlider
                label="Payment Promptness"
                value={paymentPromptness}
                onChange={setPaymentPromptness}
              />
              <CriteriaSlider
                label="Accessibility"
                value={accessibility}
                onChange={setAccessibility}
                description="Was the customer easy to reach and work with?"
              />
              <CriteriaSlider
                label="Communication"
                value={communication}
                onChange={setCommunication}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Review
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Optional notes about the customer..."
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
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-4">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || overallRating < 1}>
            {submitting ? "Submitting..." : "Submit Rating"}
          </Button>
        </div>
      </div>
    </div>
  );
}
