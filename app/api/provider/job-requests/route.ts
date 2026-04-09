import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { AuthError, requireSessionUser } from "@/lib/server/session";
import { Timestamp } from "firebase-admin/firestore";

const REQUEST_TTL_MS = 15 * 60 * 1000;

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const maybe = value as { toDate?: () => Date };
    if (typeof maybe.toDate === "function") return maybe.toDate().toISOString();
  }
  return null;
}

function toMillis(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const ts = new Date(value).getTime();
    return Number.isFinite(ts) ? ts : null;
  }
  if (value instanceof Date) return value.getTime();
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const maybe = value as { toDate?: () => Date };
    if (typeof maybe.toDate === "function") return maybe.toDate().getTime();
  }
  if (typeof value === "object" && value !== null && "toMillis" in value) {
    const maybe = value as { toMillis?: () => number };
    if (typeof maybe.toMillis === "function") return maybe.toMillis();
  }
  return null;
}

function normalizedExpiresAt(createdAt: unknown, rawExpiresAt: unknown): string {
  const now = Date.now();
  const createdMs = toMillis(createdAt) ?? now;
  const hardTtlMs = createdMs + REQUEST_TTL_MS;
  const existingMs = toMillis(rawExpiresAt);
  const effectiveMs = existingMs && Number.isFinite(existingMs)
    ? Math.min(existingMs, hardTtlMs)
    : hardTtlMs;
  return new Date(effectiveMs).toISOString();
}

export async function GET() {
  try {
    const sessionUser = await requireSessionUser();
    const workerId = sessionUser.uid;

    const [jobRequestsSnap, bookingsSnap] = await Promise.all([
      adminDb
        .collection("jobRequests")
        .where("workerId", "==", workerId)
        .where("status", "==", "pending")
        .limit(50)
        .get(),
      adminDb
        .collection("bookings")
        .where("providerId", "==", workerId)
        .where("status", "==", "pending")
        .limit(50)
        .get(),
    ]);

    const rows = jobRequestsSnap.docs.map((entry) => {
      const data = entry.data() ?? {};
      return {
        id: entry.id,
        workerId: String(data.workerId ?? ""),
        bookingId: String(data.bookingId ?? ""),
        customerId: String(data.customerId ?? ""),
        customerName: String(data.customerName ?? "Customer"),
        customerPhone: String(data.customerPhone ?? ""),
        customerAddress: data.customerAddress ?? {},
        customerRating: Number(data.customerRating ?? 0),
        service: String(data.service ?? ""),
        description: String(data.description ?? ""),
        photos: Array.isArray(data.photos) ? data.photos.map(String) : [],
        scheduledTime: toIso(data.scheduledTime),
        estimatedPrice: Number(data.estimatedPrice ?? 0),
        distance: Number(data.distance ?? 0),
        status: "pending",
        expiresAt: normalizedExpiresAt(data.createdAt, data.expiresAt),
        createdAt: toIso(data.createdAt),
      };
    });

    const bookingIds = new Set(rows.map((item) => item.bookingId));
    const fallbackRows = bookingsSnap.docs
      .filter((entry) => !bookingIds.has(entry.id))
      .map((entry) => {
        const data = entry.data() ?? {};
        const address = String(data.address ?? "");
        const pincodeMatch = address.match(/\b(\d{6})\b/);
        const pincode = pincodeMatch ? pincodeMatch[1] : "";
        return {
          id: entry.id,
          workerId: String(data.providerId ?? ""),
          bookingId: entry.id,
          customerId: String(data.customerId ?? ""),
          customerName: String(data.customerName ?? "Customer"),
          customerPhone: String(data.customerPhone ?? ""),
          customerAddress: { fullAddress: address, pincode },
          customerRating: 0,
          service: String(data.serviceCategory ?? ""),
          description: "",
          photos: Array.isArray(data.jobPhotos) ? data.jobPhotos.map(String) : [],
          scheduledTime: toIso(data.scheduledAt) ?? new Date().toISOString(),
          estimatedPrice: Number(data.amount ?? 0),
          distance: 0,
          status: "pending",
          expiresAt: normalizedExpiresAt(data.createdAt, data.expiresAt ?? data.scheduledAt),
          createdAt: toIso(data.createdAt),
        };
      });

    const pendingJobs = [...rows, ...fallbackRows];

    return NextResponse.json({ pendingJobs });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Provider Pending Jobs] failed:", error);
    return NextResponse.json({ error: "Failed to load pending requests" }, { status: 500 });
  }
}
