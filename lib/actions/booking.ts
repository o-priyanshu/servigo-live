"use server";

/**
 * @file lib/actions/booking.ts
 *
 * Server Action for creating bookings.
 * Runs server-side — has access to session and adminDb directly.
 * Never exposes Firebase Admin to the client.
 */

import { adminDb } from "@/lib/firebase-admin";
import { requireSessionUser } from "@/lib/server/session";
import { FieldValue } from "firebase-admin/firestore";

const ACTIVE_BOOKING_STATUSES = ["pending", "confirmed", "in_progress"] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateBookingInput {
  providerId: string;
  serviceCategory: string;
  scheduledAt: string; // ISO 8601 string
  address: string;
  amount: number;
}

export interface CreateBookingResult {
  bookingId: string;
  status: "pending";
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateBookingInput(input: CreateBookingInput): string | null {
  if (!input.providerId?.trim()) return "Provider is required.";
  if (!input.serviceCategory?.trim()) return "Service category is required.";
  if (!input.address?.trim()) return "Address is required.";

  if (typeof input.amount !== "number" || input.amount <= 0) {
    return "Amount must be a positive number.";
  }

  const scheduledDate = new Date(input.scheduledAt);
  if (isNaN(scheduledDate.getTime())) {
    return "Scheduled date is invalid.";
  }
  if (scheduledDate.getTime() <= Date.now()) {
    return "Scheduled date must be in the future.";
  }

  return null; // valid
}

// ─── Action ───────────────────────────────────────────────────────────────────

export async function createBooking(
  input: CreateBookingInput
): Promise<CreateBookingResult> {
  // ✅ Server-side auth — cannot be spoofed from the client
  const sessionUser = await requireSessionUser();

  // Prevent providers/admins booking themselves
  if (input.providerId === sessionUser.uid) {
    throw new Error("You cannot book yourself.");
  }

  const validationError = validateBookingInput(input);
  if (validationError) {
    throw new Error(validationError);
  }
  const requestedTs = new Date(input.scheduledAt).getTime();
  const duplicateSnap = await adminDb
    .collection("bookings")
    .where("customerId", "==", sessionUser.uid)
    .where("providerId", "==", input.providerId)
    .where("status", "in", [...ACTIVE_BOOKING_STATUSES])
    .limit(25)
    .get();
  const hasDuplicate = duplicateSnap.docs.some((entry) => {
    const existingTs = new Date(String(entry.data().scheduledAt ?? "")).getTime();
    if (!Number.isFinite(existingTs)) return false;
    return Math.abs(existingTs - requestedTs) < 5 * 60 * 1000;
  });
  if (hasDuplicate) {
    throw new Error("You already have an active booking with this provider for the selected time.");
  }

  // Verify provider exists and is verified before creating booking
  const providerSnap = await adminDb
    .collection("providers")
    .doc(input.providerId)
    .get();

  if (!providerSnap.exists) {
    throw new Error("Provider not found.");
  }

  const providerData = providerSnap.data() ?? {};

  if (providerData.verificationStatus !== "verified") {
    throw new Error("This provider is not yet verified.");
  }
  if (providerData.isAvailable !== true) {
    throw new Error("This provider is not available right now.");
  }

  const bookingRef = adminDb.collection("bookings").doc();

  await bookingRef.set({
    customerId: sessionUser.uid,
    providerId: input.providerId,
    serviceCategory: input.serviceCategory,
    scheduledAt: input.scheduledAt,
    address: input.address,
    amount: input.amount,
    status: "pending",
    payment: {
      status: "held",
      holdAmount: input.amount,
      heldBy: "platform",
      heldAt: FieldValue.serverTimestamp(),
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    bookingId: bookingRef.id,
    status: "pending",
  };
}
