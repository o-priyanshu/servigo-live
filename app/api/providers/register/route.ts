import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { requireSessionUser, AuthError } from "@/lib/server/session";

export async function POST(request: Request) {
  try {
    const sessionUser = await requireSessionUser();

    // ✅ isBlocked — matches SessionUser interface
    if (sessionUser.isBlocked) {
      return NextResponse.json(
        { error: "Account suspended" },
        { status: 403 }
      );
    }

    if (!sessionUser.emailVerified) {
      return NextResponse.json(
        { error: "Email verification required" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { serviceCategory, bio, yearsOfExperience, serviceAreaRadiusKm, location, documents } = body;

    // Basic validation
    if (!serviceCategory || !bio || !location || !documents) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!documents.idProofPath?.trim() || !documents.selfiePath?.trim()) {
      return NextResponse.json(
        { error: "ID proof and selfie are required" },
        { status: 400 }
      );
    }

    // Prevent duplicate profiles
    const existing = await adminDb
      .collection("providers")
      .doc(sessionUser.uid)
      .get();

    if (existing.exists) {
      return NextResponse.json(
        { error: "Provider profile already exists" },
        { status: 409 }
      );
    }

    const providerRef = adminDb.collection("providers").doc(sessionUser.uid);
    const now = FieldValue.serverTimestamp();

    await providerRef.set({
      uid: sessionUser.uid,
      serviceCategory,
      bio: bio?.trim().slice(0, 1000) ?? "",
      yearsOfExperience: Math.max(0, Math.min(60, Number(yearsOfExperience || 0))),
      verificationStatus: "pending",
      verificationLevel: documents.policeCertificatePath ? 2 : 1,
      verificationBadge: false,
      serviceAreaRadiusKm: Math.max(1, Math.min(500, Number(serviceAreaRadiusKm || 5))),
      isAvailable: false,           // ✅ matches ProviderProfile type
      rating: null,                 // ✅ matches ProviderProfile type
      reviewCount: 0,               // ✅ matches ProviderProfile type
      completedJobs: 0,
      documents: {
        idProofPath: documents.idProofPath ?? "",
        selfiePath: documents.selfiePath ?? "",
        ...(documents.policeCertificatePath && {
          policeCertificatePath: documents.policeCertificatePath,
        }),
      },
      location: {                   // ✅ matches ProviderProfile type
        lat: Number(location?.lat || 0),
        lng: Number(location?.lng || 0),
        city: location?.city ?? "",
      },
      fraudFlags: {
        repeatedComplaints: false,
        highCancellationRate: false,
      },
      moderation: "none",           // ✅ matches Firestore rule + ModerationStatus type
      createdAt: now,
      updatedAt: now,
    });

    // Update user role in Firestore
    await adminDb
      .collection("users")
      .doc(sessionUser.uid)
      .set({ role: "provider", updatedAt: now }, { merge: true });

    // ✅ Sync custom claims so middleware JWT checks pick up new role immediately
    await adminAuth.setCustomUserClaims(sessionUser.uid, {
      role: "provider",
      blocked: false,
    });

    return NextResponse.json({ status: "pending_verification" });
  } catch (error: unknown) {
    // ✅ instanceof AuthError — not error.message string check
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.error("[Providers] Register error:", error);
    return NextResponse.json(
      { error: "Failed to register provider profile" },
      { status: 500 }
    );
  }
}
