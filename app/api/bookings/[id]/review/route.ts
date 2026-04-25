import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { requireSessionUser, AuthError } from "@/lib/server/session";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function ratingDocId(bookingId: string, userId: string): string {
  return `${bookingId}_${userId}`;
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
    if (booking.customerId !== sessionUser.uid && booking.providerId !== sessionUser.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ratingSnap = await adminDb.collection("ratings").doc(ratingDocId(id, sessionUser.uid)).get();
    if (ratingSnap.exists) {
      const data = ratingSnap.data() ?? {};
      return NextResponse.json({
        review: {
          ...data,
          rating: Number(data.overallRating ?? 0),
          comment: String(data.reviewText ?? ""),
        },
      });
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
    const rating = Number(body?.rating ?? body?.overallRating);
    const comment = String(body?.comment ?? body?.reviewText ?? "").trim();
    const criteriaRatings =
      (body?.criteriaRatings && typeof body.criteriaRatings === "object" ? body.criteriaRatings : null) ?? {
        punctuality: rating,
        quality: rating,
        behavior: rating,
        cleanliness: rating,
        valueForMoney: rating,
      };
    const tags = Array.isArray(body?.tags) ? body.tags.filter((item: unknown) => typeof item === "string") : [];

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }
    if (comment.length < 3 || comment.length > 2000) {
      return NextResponse.json({ error: "Comment length is invalid" }, { status: 400 });
    }

    const ratingRef = adminDb.collection("ratings").doc(ratingDocId(id, sessionUser.uid));
    const existing = await ratingRef.get();
    if (existing.exists) {
      return NextResponse.json({ error: "Review already submitted" }, { status: 409 });
    }

    const ratingPayload = {
      bookingId: id,
      raterId: sessionUser.uid,
      raterType: "customer",
      ratedId: String(booking.providerId ?? ""),
      ratedType: "worker",
      overallRating: rating,
      criteriaRatings: {
        punctuality: Number((criteriaRatings as Record<string, unknown>).punctuality ?? rating),
        quality: Number((criteriaRatings as Record<string, unknown>).quality ?? rating),
        behavior: Number((criteriaRatings as Record<string, unknown>).behavior ?? rating),
        cleanliness: Number((criteriaRatings as Record<string, unknown>).cleanliness ?? rating),
        valueForMoney: Number((criteriaRatings as Record<string, unknown>).valueForMoney ?? rating),
      },
      comment,
      reviewText: comment,
      tags,
      status: "submitted",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await adminDb.runTransaction(async (tx) => {
      const legacyReviewRef = adminDb.collection("reviews").doc(id);
      tx.set(ratingRef, ratingPayload);
      tx.set(
        legacyReviewRef,
        {
          bookingId: id,
          providerId: booking.providerId,
          customerId: sessionUser.uid,
          rating,
          comment,
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
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
