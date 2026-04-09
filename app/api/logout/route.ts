import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { adminAuth, isFirebaseError } from "@/lib/firebase-admin";
import { SESSION_COOKIE_NAME } from "@/lib/server/constants";

export async function POST(request: NextRequest) {
  // ✅ NextRequest has .cookies — Request does not
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (sessionCookie) {
    try {
      const decoded = await adminAuth.verifySessionCookie(sessionCookie);
      await adminAuth.revokeRefreshTokens(decoded.uid);
    } catch (error: unknown) {
      if (isFirebaseError(error)) {
        console.warn("[Logout] Token revocation skipped:", error.code);
      }
    }
  }

  const response = NextResponse.json({ status: "success" });

  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
    path: "/",
    sameSite: "lax",
  });

  return response;
}