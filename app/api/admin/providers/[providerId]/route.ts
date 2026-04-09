import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { requireAdminSession } from "@/lib/admin/auth";

type ReviewAction = "approve" | "reject" | "suspend";
const VALID_ACTIONS: ReviewAction[] = ["approve", "reject", "suspend"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ providerId: string }> }
) {
  try {
    const adminSession = await requireAdminSession();

    if (!adminSession || adminSession.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { providerId } = await params;

    if (!providerId?.trim()) {
      return NextResponse.json(
        { error: "Missing provider ID" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const action = body.action as unknown;
    const reason = body.reason as unknown;

    if (!VALID_ACTIONS.includes(action as ReviewAction)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(", ")}` },
        { status: 400 }
      );
    }

    if (action === "reject" && !reason) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 }
      );
    }

    const providerSnap = await adminDb
      .collection("providers")
      .doc(providerId)
      .get();

    if (!providerSnap.exists) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      );
    }

    const now = FieldValue.serverTimestamp();
    const providerRef = adminDb.collection("providers").doc(providerId);
    const userRef = adminDb.collection("users").doc(providerId);

    const nextStatus =
      action === "approve"
        ? "verified"
        : action === "reject"
        ? "rejected"
        : "suspended";

    const isApproved = action === "approve";
    const isSuspended = action === "suspend";

    const moderationMeta: {
      lastReviewedBy: string;
      lastReviewedAt: ReturnType<typeof FieldValue.serverTimestamp>;
      rejectionReason?: string;
    } = {
      lastReviewedBy: adminSession.sub,
      lastReviewedAt: now,
    };

    if (reason && typeof reason === "string") {
      moderationMeta.rejectionReason = reason;
    }

    await providerRef.set(
      {
        verificationStatus: nextStatus,
        verificationBadge: isApproved,
        isAvailable: isApproved,
        moderation: isSuspended ? "flagged" : isApproved ? "cleared" : "none",
        moderationMeta,
        updatedAt: now,
      },
      { merge: true }
    );

    await userRef.set(
      {
        isBlocked: isSuspended,
        status: isApproved ? "active" : action === "reject" ? "rejected" : "blocked",
        updatedAt: now,
      },
      { merge: true }
    );

    await adminAuth.setCustomUserClaims(providerId, {
      role: "provider",
      blocked: isSuspended,
    });

    if (isSuspended) {
      await adminAuth.revokeRefreshTokens(providerId);
    }

    return NextResponse.json({ status: nextStatus });
  } catch (error: unknown) {
    console.error("[Admin] Provider moderation error:", error);
    return NextResponse.json(
      { error: "Failed to process moderation action" },
      { status: 500 }
    );
  }
}
