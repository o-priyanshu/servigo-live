import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { requireSessionUser, AuthError } from "@/lib/server/session";

const VALID_REASONS = [
  "fraud",
  "no_show",
  "poor_quality",
  "harassment",
  "safety_concern",
  "other",
] as const;

type ReportReason = (typeof VALID_REASONS)[number];

export async function POST(request: Request) {
  try {
    const sessionUser = await requireSessionUser();

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { bookingId, reportedUserId, reason, details } = body as {
      bookingId: unknown;
      reportedUserId: unknown;
      reason: unknown;
      details: unknown;
    };

    // ✅ Validate all required fields
    if (typeof bookingId !== "string" || !bookingId.trim()) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    if (typeof reportedUserId !== "string" || !reportedUserId.trim()) {
      return NextResponse.json(
        { error: "Reported user ID is required" },
        { status: 400 }
      );
    }

    if (!VALID_REASONS.includes(reason as ReportReason)) {
      return NextResponse.json(
        { error: `Invalid reason. Must be one of: ${VALID_REASONS.join(", ")}` },
        { status: 400 }
      );
    }

    // ✅ Prevent self-reporting
    if (reportedUserId === sessionUser.uid) {
      return NextResponse.json(
        { error: "You cannot report yourself" },
        { status: 400 }
      );
    }

    // ✅ Verify booking exists and reporter is a participant
    const bookingSnap = await adminDb
      .collection("bookings")
      .doc(bookingId)
      .get();

    if (!bookingSnap.exists) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const bookingData = bookingSnap.data();
    const isParticipant =
      bookingData?.customerId === sessionUser.uid ||
      bookingData?.providerId === sessionUser.uid;

    if (!isParticipant) {
      return NextResponse.json(
        { error: "You are not a participant in this booking" },
        { status: 403 }
      );
    }

    // ✅ Reported user must be the other participant
    const isValidReportTarget =
      reportedUserId === bookingData?.customerId ||
      reportedUserId === bookingData?.providerId;

    if (!isValidReportTarget) {
      return NextResponse.json(
        { error: "Reported user is not a participant in this booking" },
        { status: 400 }
      );
    }

    // ✅ Prevent duplicate reports for the same booking by same reporter
    const existingReport = await adminDb
      .collection("reports")
      .where("bookingId", "==", bookingId)
      .where("reporterId", "==", sessionUser.uid)
      .limit(1)
      .get();

    if (!existingReport.empty) {
      return NextResponse.json(
        { error: "You have already submitted a report for this booking" },
        { status: 409 }
      );
    }

    const reportRef = adminDb.collection("reports").doc();

    await reportRef.set({
      bookingId,
      reporterId: sessionUser.uid,
      reportedUserId,
      reason,
      details: typeof details === "string" ? details.trim().slice(0, 2000) : "",
      status: "open",
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ id: reportRef.id, status: "open" });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.error("[Reports] Create error:", error);
    return NextResponse.json(
      { error: "Failed to submit report" },
      { status: 500 }
    );
  }
}