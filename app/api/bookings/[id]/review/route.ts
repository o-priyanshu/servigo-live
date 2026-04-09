import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { requireSessionUser, AuthError } from "@/lib/server/session";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, context: RouteContext) {
  try {
    const sessionUser = await requireSessionUser();
    const { id } = await context.params;

    const bookingSnap = await adminDb.collection("bookings").doc(id).get();
    if (!bookingSnap.exists) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    const booking = bookingSnap.data() ?? {};
    if (booking.customerId !== sessionUser.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const reviewSnap = await adminDb.collection("reviews").doc(id).get();
    if (!reviewSnap.exists) {
      return NextResponse.json({ review: null });
    }
    return NextResponse.json({ review: reviewSnap.data() ?? null });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Booking Review] GET failed:", error);
    return NextResponse.json({ error: "Failed to load review" }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const sessionUser = await requireSessionUser();
    const { id } = await context.params;

    const bookingSnap = await adminDb.collection("bookings").doc(id).get();
    if (!bookingSnap.exists) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = bookingSnap.data() ?? {};
    if (booking.customerId !== sessionUser.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (booking.status !== "completed") {
      return NextResponse.json(
        { error: "Review allowed only for completed bookings" },
        { status: 409 }
      );
    }

    const body = await request.json().catch(() => null);
    const rating = Number(body?.rating);
    const comment = String(body?.comment ?? "").trim();

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }
    if (comment.length < 3 || comment.length > 2000) {
      return NextResponse.json({ error: "Comment length is invalid" }, { status: 400 });
    }

    const reviewRef = adminDb.collection("reviews").doc(id);
    const existing = await reviewRef.get();
    if (existing.exists) {
      return NextResponse.json({ error: "Review already submitted" }, { status: 409 });
    }

    const providerRef = adminDb.collection("providers").doc(String(booking.providerId));
    await adminDb.runTransaction(async (tx) => {
      const providerSnap = await tx.get(providerRef);
      if (!providerSnap.exists) return;

      const data = providerSnap.data() ?? {};
      const currentCount = Number(data.reviewCount ?? 0);
      const currentRating = Number(data.rating ?? 0);

      const nextCount = currentCount + 1;
      const nextRating = (currentRating * currentCount + rating) / nextCount;

      tx.set(
        providerRef,
        {
          reviewCount: nextCount,
          rating: Number(nextRating.toFixed(2)),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // Also mark review as submitted on the reviewRef within the same transaction
      tx.set(reviewRef, {
        bookingId: id,
        providerId: booking.providerId,
        customerId: sessionUser.uid,
        rating,
        comment,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Booking Review] POST failed:", error);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
