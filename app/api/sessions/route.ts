import { NextResponse } from "next/server";
import { adminAuth, adminDb, isFirebaseError } from "@/lib/firebase-admin";
import { SESSION_COOKIE_NAME } from "@/lib/server/constants";

export const runtime = "nodejs"; // 🔒 Required for Admin SDK

const SESSION_EXPIRES_MS = 60 * 60 * 24 * 2 * 1000;
const SESSION_EXPIRES_S = 60 * 60 * 24 * 2;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const idToken = typeof body?.idToken === "string" ? body.idToken : null;

    if (!idToken) {
      return NextResponse.json(
        { error: "Missing or invalid token" },
        { status: 400 }
      );
    }

    const decoded = await adminAuth.verifyIdToken(idToken, true);

    const userSnap = await adminDb.collection("users").doc(decoded.uid).get();

    if (!userSnap.exists) {
      return NextResponse.json(
        { error: "User not found. Complete registration first." },
        { status: 404 }
      );
    }

    if (userSnap.data()?.isBlocked === true) {
      await adminAuth.revokeRefreshTokens(decoded.uid);
      return NextResponse.json(
        { error: "Account suspended" },
        { status: 403 }
      );
    }

    if (userSnap.data()?.emailVerified !== true) {
      return NextResponse.json(
        { error: "Email verification required" },
        { status: 403 }
      );
    }

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRES_MS,
    });

    const response = NextResponse.json({ status: "success" });

    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_EXPIRES_S,
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error: unknown) {
    if (isFirebaseError(error)) {
      if (
        error.code === "auth/id-token-expired" ||
        error.code === "auth/id-token-revoked" ||
        error.code === "auth/argument-error"
      ) {
        return NextResponse.json(
          { error: "Invalid or expired token" },
          { status: 401 }
        );
      }
    }

    console.error("[Sessions] Unexpected error:", error);

    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
