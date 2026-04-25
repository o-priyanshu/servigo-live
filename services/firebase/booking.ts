import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  type QueryConstraint,
  updateDoc,
  where,
} from "firebase/firestore";
import { uploadFileToCloudinary } from "@/lib/cloudinary-upload";
import type { BookingStatus, ServiceCategory } from "@/lib/types/index";
import { db } from "@/lib/firebase";
import type { Booking } from "@/services/firebase/types";
import { asNumber, asString, toIsoString } from "@/services/firebase/utils";

function asServiceCategory(value: unknown): ServiceCategory {
  const category = String(value ?? "electrician");
  if (category === "plumber" || category === "cleaner" || category === "carpenter" || category === "appliance_repair") {
    return category;
  }
  return "electrician";
}

function asBookingStatus(value: unknown): BookingStatus {
  const status = String(value ?? "pending");
  if (
    status === "confirmed" ||
    status === "in_progress" ||
    status === "awaiting_customer_confirmation" ||
    status === "extension_requested" ||
    status === "completed" ||
    status === "cancelled"
  ) {
    return status;
  }
  return "pending";
}

function toBooking(id: string, data: Record<string, unknown>): Booking {
  const payment = (data.payment ?? {}) as Record<string, unknown>;
  return {
    id,
    customerId: asString(data.customerId, ""),
    providerId: asString(data.providerId, ""),
    serviceCategory: asServiceCategory(data.serviceCategory),
    status: asBookingStatus(data.status),
    scheduledAt: asString(data.scheduledAt, new Date().toISOString()),
    address: asString(data.address, ""),
    amount: asNumber(data.amount, 0),
    safetyShield: data.safetyShield === true,
    payment: {
      status:
        payment.status === "held" || payment.status === "captured" || payment.status === "refunded"
          ? payment.status
          : "none",
      holdAmount: typeof payment.holdAmount === "number" ? payment.holdAmount : undefined,
      heldAt: toIsoString(payment.heldAt),
      capturedAt: toIsoString(payment.capturedAt),
      refundedAt: toIsoString(payment.refundedAt),
    },
    jobPhotos: Array.isArray(data.jobPhotos) ? data.jobPhotos.map((item) => String(item)) : [],
    cancellationReason: typeof data.cancellationReason === "string" ? data.cancellationReason : undefined,
    cancellationCharge: typeof data.cancellationCharge === "number" ? data.cancellationCharge : undefined,
    serviceDeadlineAt: typeof data.serviceDeadlineAt === "string" ? data.serviceDeadlineAt : undefined,
    completionRequestedAt:
      typeof data.completionRequestedAt === "string" ? data.completionRequestedAt : undefined,
    completionRequestedBy:
      typeof data.completionRequestedBy === "string" ? data.completionRequestedBy : undefined,
    completionApprovedAt:
      typeof data.completionApprovedAt === "string" ? data.completionApprovedAt : undefined,
    extensionRequestedAt:
      typeof data.extensionRequestedAt === "string" ? data.extensionRequestedAt : undefined,
    extensionRequestedBy:
      typeof data.extensionRequestedBy === "string" ? data.extensionRequestedBy : undefined,
    requestedExtensionMinutes:
      typeof data.requestedExtensionMinutes === "number" ? data.requestedExtensionMinutes : undefined,
    extensionApprovedAt:
      typeof data.extensionApprovedAt === "string" ? data.extensionApprovedAt : undefined,
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
    completedAt: toIsoString(data.completedAt),
  };
}

export const createBooking = async (bookingData: Omit<Booking, "id" | "createdAt" | "status">): Promise<string> => {
  if (!bookingData.customerId) throw new Error("Customer id is required.");
  if (!bookingData.providerId) throw new Error("Worker id is required.");
  if (!bookingData.address.trim()) throw new Error("Address is required.");
  if (bookingData.amount <= 0) throw new Error("Amount must be greater than zero.");

  const scheduledAtTime = new Date(bookingData.scheduledAt).getTime();
  if (!Number.isFinite(scheduledAtTime) || scheduledAtTime <= Date.now()) {
    throw new Error("Scheduled date/time must be in the future.");
  }

  const res = await fetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      providerId: bookingData.providerId,
      serviceCategory: bookingData.serviceCategory,
      scheduledAt: bookingData.scheduledAt,
      address: bookingData.address,
      amount: bookingData.amount,
      jobPhotos: Array.isArray(bookingData.jobPhotos) ? bookingData.jobPhotos : [],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : "Failed to create booking.");
  }
  const bookingId = String(data?.id ?? "");
  if (!bookingId) throw new Error("Booking was created but no id was returned.");
  return bookingId;
};

export const getBookingById = async (bookingId: string): Promise<Booking> => {
  const snap = await getDoc(doc(db, "bookings", bookingId));
  if (!snap.exists()) {
    throw new Error("Booking not found.");
  }
  return toBooking(snap.id, snap.data() as Record<string, unknown>);
};

export const getCustomerBookings = async (
  customerId: string,
  status?: Booking["status"][]
): Promise<Booking[]> => {
  const bookingsRef = collection(db, "bookings");
  const constraints: QueryConstraint[] = [where("customerId", "==", customerId)];
  if (Array.isArray(status) && status.length > 0) {
    constraints.push(where("status", "in", status.slice(0, 10)));
  }
  const snap = await getDocs(query(bookingsRef, ...constraints, firestoreLimit(200)));
  const rows = snap.docs.map((entry) => toBooking(entry.id, entry.data() as Record<string, unknown>));
  rows.sort((a, b) => {
    const ta = new Date(a.scheduledAt).getTime();
    const tb = new Date(b.scheduledAt).getTime();
    if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
    return tb - ta;
  });
  return rows;
};

export const getActiveBooking = async (customerId: string): Promise<Booking | null> => {
  const rows = await getCustomerBookings(customerId, [
    "pending",
    "confirmed",
    "in_progress",
    "awaiting_customer_confirmation",
    "extension_requested",
  ]);
  return rows[0] ?? null;
};

export const cancelBooking = async (bookingId: string, reason?: string): Promise<void> => {
  const res = await fetch(`/api/bookings/${bookingId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "cancel", reason: reason?.trim() || "" }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : "Unable to cancel booking");
  }
};

export const completeBooking = async (bookingId: string, rating: number, review: string): Promise<void> => {
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new Error("Rating must be between 1 and 5.");
  }
  if (review.trim().length < 3) {
    throw new Error("Review must be at least 3 characters.");
  }

  const workflowRes = await fetch(`/api/bookings/${bookingId}/workflow`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "approve_completion" }),
  });
  const workflowData = await workflowRes.json().catch(() => ({}));
  if (!workflowRes.ok) {
    throw new Error(typeof workflowData?.error === "string" ? workflowData.error : "Unable to complete booking.");
  }

  const response = await fetch(`/api/bookings/${bookingId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating, comment: review.trim() }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : "Failed to submit review.");
  }
};

export const uploadDisputeEvidence = async (
  bookingId: string,
  file: File,
  customerId: string
): Promise<string> => {
  if (!bookingId) throw new Error("Booking id is required.");
  if (!customerId) throw new Error("Customer id is required.");
  if (!(file instanceof File)) throw new Error("Valid evidence file is required.");

  return uploadFileToCloudinary(file, {
    folder: `bookings/${bookingId}/disputes`,
    publicIdPrefix: customerId,
  });
};

export const uploadBookingJobPhoto = async (
  customerId: string,
  providerId: string,
  file: File
): Promise<string> => {
  if (!customerId) throw new Error("Customer id is required.");
  if (!providerId) throw new Error("Worker id is required.");
  if (!(file instanceof File)) throw new Error("Valid photo file is required.");

  return uploadFileToCloudinary(file, {
    folder: `bookings/drafts/${customerId}`,
    publicIdPrefix: providerId,
  });
};

export const raiseDispute = async (bookingId: string, reason: string, evidence?: string[]): Promise<void> => {
  if (!reason.trim()) {
    throw new Error("Dispute reason is required.");
  }
  const disputeRef = doc(collection(db, "bookings", bookingId, "disputes"));
  await updateDoc(doc(db, "bookings", bookingId), {
    disputeOpen: true,
    disputeReason: reason.trim(),
    disputeUpdatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await setDoc(disputeRef, {
    reason: reason.trim(),
    evidence: Array.isArray(evidence) ? evidence : [],
    createdAt: serverTimestamp(),
    status: "open",
  });
};

export const subscribeToBookingUpdates = (
  bookingId: string,
  callback: (booking: Booking) => void
): (() => void) => {
  const ref = doc(db, "bookings", bookingId);
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;
    callback(toBooking(snap.id, snap.data() as Record<string, unknown>));
  });
};
