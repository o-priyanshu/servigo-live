import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { requireSessionUser, AuthError } from "@/lib/server/session";
import type { ServiceCategory } from "@/lib/types/index";
import { normalizeProviderDisplayName } from "@/lib/server/provider-display";
import { getProviderProfileImage } from "@/lib/profile-image";

const ACTIVE_BOOKING_STATUSES = ["pending", "confirmed", "in_progress"] as const;
const REQUEST_TTL_MS = 15 * 60 * 1000;

function extractPincode(value: string): string {
  const match = value.match(/\b(\d{6})\b/);
  return match ? match[1] : "";
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const maybe = value as { toDate?: () => Date };
    if (typeof maybe.toDate === "function") return maybe.toDate().toISOString();
  }
  if (typeof value === "object" && value !== null && "toMillis" in value) {
    const maybe = value as { toMillis?: () => number };
    if (typeof maybe.toMillis === "function") return new Date(maybe.toMillis()).toISOString();
  }
  return null;
}

export async function GET() {
  try {
    const sessionUser = await requireSessionUser();

    const bookingsSnap = await adminDb
      .collection("bookings")
      .where("customerId", "==", sessionUser.uid)
      .limit(50)
      .get();

    const bookings = await Promise.all(
      bookingsSnap.docs.map(async (docSnap) => {
        const booking = docSnap.data();
        const providerId = booking.providerId as string;

        let providerName = "Provider";
        const [userSnap, providerSnap] = await Promise.all([
          adminDb.collection("users").doc(providerId).get(),
          adminDb.collection("providers").doc(providerId).get(),
        ]);
        const providerData = providerSnap.data() ?? {};
        if (userSnap.exists) {
          providerName = (userSnap.data()?.name as string) ?? providerName;
        }
        const category = String(booking.serviceCategory ?? "electrician") as ServiceCategory;
        providerName = normalizeProviderDisplayName(providerName, category, providerId);
        const providerPhoto = getProviderProfileImage({
          providerId,
          providerName,
          category,
          photo: String(
            providerData.photo ??
              providerData.verificationData?.profilePhotoUrl ??
              providerData.verificationData?.selfieUrl ??
              ""
          ),
        });

        return {
          id: docSnap.id,
          providerId,
          providerName,
          providerPhoto,
          providerPhotoUpdatedAt: toIso(providerData.updatedAt),
          serviceCategory: booking.serviceCategory,
          status: booking.status,
          scheduledAt: booking.scheduledAt,
          address: booking.address,
          amount: booking.amount,
          createdAt: booking.createdAt ?? null,
        };
      })
    );

    bookings.sort((a, b) => {
      const ta = new Date(a.scheduledAt).getTime();
      const tb = new Date(b.scheduledAt).getTime();
      if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
      return tb - ta;
    });

    return NextResponse.json({ bookings });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Bookings] GET failed:", error);
    return NextResponse.json({ error: "Failed to load bookings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await requireSessionUser();

    if (sessionUser.isBlocked) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    if (!sessionUser.emailVerified) {
      return NextResponse.json({ error: "Email verification required" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { providerId, serviceCategory, scheduledAt, address, amount } = body;

    if (!providerId || !serviceCategory || !scheduledAt || !address) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
    }

    if (providerId === sessionUser.uid) {
      return NextResponse.json({ error: "You cannot book yourself" }, { status: 400 });
    }

    const scheduledDate = new Date(scheduledAt);
    if (Number.isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
      return NextResponse.json({ error: "Scheduled date must be a valid future date" }, { status: 400 });
    }

    const duplicateSnap = await adminDb
      .collection("bookings")
      .where("customerId", "==", sessionUser.uid)
      .where("providerId", "==", providerId)
      .where("status", "in", [...ACTIVE_BOOKING_STATUSES])
      .limit(25)
      .get();

    const requestedTs = scheduledDate.getTime();
    const hasDuplicate = duplicateSnap.docs.some((entry) => {
      const existingTs = new Date(String(entry.data().scheduledAt ?? "")).getTime();
      if (!Number.isFinite(existingTs)) return false;
      return Math.abs(existingTs - requestedTs) < 5 * 60 * 1000;
    });

    if (hasDuplicate) {
      return NextResponse.json(
        { error: "You already have an active booking with this provider for the selected time." },
        { status: 409 }
      );
    }

    const providerSnap = await adminDb.collection("providers").doc(providerId).get();

    if (!providerSnap.exists) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    const providerData = providerSnap.data();

    if (providerData?.verificationStatus !== "verified") {
      return NextResponse.json({ error: "Provider is not verified" }, { status: 409 });
    }

    if (providerData?.isAvailable !== true) {
      return NextResponse.json({ error: "Provider is not available" }, { status: 409 });
    }

    const bookingRef = adminDb.collection("bookings").doc();
    const jobRequestRef = adminDb.collection("jobRequests").doc();
    const now = FieldValue.serverTimestamp();
    const expiresAt = new Date(Date.now() + REQUEST_TTL_MS);

    const customerSnap = await adminDb.collection("users").doc(sessionUser.uid).get();
    const customer = customerSnap.exists ? customerSnap.data() ?? {} : {};

    await adminDb.runTransaction(async (tx) => {
      tx.set(bookingRef, {
        customerId: sessionUser.uid,
        providerId,
        serviceCategory,
        status: "pending",
        scheduledAt,
        address,
        amount,
        jobRequestId: jobRequestRef.id,
        payment: {
          status: "held",
          holdAmount: amount,
          heldBy: "platform",
          heldAt: now,
        },
        createdAt: now,
        updatedAt: now,
      });

      tx.set(jobRequestRef, {
        workerId: providerId,
        bookingId: bookingRef.id,
        customerId: sessionUser.uid,
        customerName: String(customer.name ?? "Customer"),
        customerPhone: String(customer.phone ?? ""),
        customerAddress: {
          fullAddress: String(address),
          pincode: extractPincode(String(address)),
        },
        customerRating: 0,
        service: String(serviceCategory).replaceAll("_", " "),
        description: "",
        photos: Array.isArray((body as { jobPhotos?: unknown }).jobPhotos)
          ? (body as { jobPhotos: unknown[] }).jobPhotos
              .filter((item) => typeof item === "string")
              .slice(0, 6)
          : [],
        scheduledTime: scheduledDate,
        estimatedPrice: amount,
        distance: 0,
        status: "pending",
        expiresAt,
        createdAt: now,
        updatedAt: now,
      });
    });

    return NextResponse.json({ id: bookingRef.id, status: "pending", paymentStatus: "held" });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("[Bookings] Unexpected error:", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
