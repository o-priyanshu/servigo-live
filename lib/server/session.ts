/**
 * @file lib/server/session.ts
 *
 * Server-side session utilities.
 * - Use `requireSessionUser()` in Server Actions and Route Handlers.
 * - Use `getSessionUserFromHeaders()` in Server Components (zero crypto overhead).
 */

import "server-only";
import { cookies, headers } from "next/headers";
import { adminAuth, adminDb, isFirebaseError } from "@/lib/firebase-admin";
import {
  type UserRole,
  isValidRole,
  normalizeRole,
  SESSION_COOKIE_NAME,
  BLOCKED_CLAIM_KEY,
  ROLE_CLAIM_KEY,
  VERIFIED_USER_ID_HEADER,
  VERIFIED_USER_ROLE_HEADER,
} from "@/lib/server/constants";
import type { DecodedIdToken } from "firebase-admin/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export type { UserRole };

export interface SessionUser {
  uid: string;
  email?: string;
  emailVerified: boolean;
  role: UserRole;
  isBlocked: boolean;
}

// ─── Errors ───────────────────────────────────────────────────────────────────

export type AuthErrorCode =
  | "UNAUTHENTICATED"
  | "SESSION_EXPIRED"
  | "SESSION_REVOKED"
  | "INVALID_SESSION"
  | "USER_BLOCKED";

export class AuthError extends Error {
  public readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode) {
    super(code);
    this.name = "AuthError";
    this.code = code;
  }
}

// ─── Primary: Read from middleware-forwarded headers ──────────────────────────

/**
 * Reads the verified user identity from headers set by middleware.
 *
 * ✅ Use this in Server Components — zero crypto overhead since middleware
 *    already verified the JWT on this request.
 *
 * ⚠️  Do NOT use this in Server Actions or Route Handlers that may be called
 *    directly (e.g. from fetch) without going through middleware, since the
 *    headers would not be set. Use `requireSessionUser()` there instead.
 *
 * Returns null if headers are not present (e.g. unauthenticated route).
 */
export async function getSessionUserFromHeaders(): Promise<Pick<
  SessionUser,
  "uid" | "role"
> | null> {
  const headerStore = await headers();
  const uid = headerStore.get(VERIFIED_USER_ID_HEADER);
  const rawRole = headerStore.get(VERIFIED_USER_ROLE_HEADER);

  if (!uid) return null;

  return {
    uid,
    role: normalizeRole(rawRole),
  };
}

// ─── Authoritative: Full JWT verification via Firebase Admin ──────────────────

/**
 * Verifies the session cookie and returns the full session user.
 *
 * ✅ Use this in Server Actions and Route Handlers.
 * ✅ Use this when you need `email`, `emailVerified`, or full role enforcement.
 *
 * Throws `AuthError` on any auth failure — catch and handle at the call site.
 */
export async function requireSessionUser(): Promise<SessionUser> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    throw new AuthError("UNAUTHENTICATED");
  }

  let decoded: DecodedIdToken;

  try {
    // `true` enables revocation check
    decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  } catch (error: unknown) {
    if (isFirebaseError(error)) {
      if (error.code === "auth/session-cookie-revoked") {
        throw new AuthError("SESSION_REVOKED");
      }
      if (
        error.code === "auth/session-cookie-expired" ||
        error.code === "auth/argument-error"
      ) {
        throw new AuthError("INVALID_SESSION");
      }
    }
    throw new AuthError("UNAUTHENTICATED");
  }

  // Defensive expiry guard against clock skew
  const now = Math.floor(Date.now() / 1000);
  if (decoded.exp < now) {
    throw new AuthError("SESSION_EXPIRED");
  }

  // Blocked check uses the same claim key as middleware
  if (decoded[BLOCKED_CLAIM_KEY] === true) {
    throw new AuthError("USER_BLOCKED");
  }

  return {
    uid: decoded.uid,
    email: decoded.email,
    emailVerified: decoded.email_verified === true,
    role: normalizeRole(decoded[ROLE_CLAIM_KEY]),
    isBlocked: false,
  };
}

// ─── Optional: Canonical role from Firestore ──────────────────────────────────

/**
 * Fetches the user's role directly from Firestore.
 *
 * Use when you need to double-check the role against the database rather
 * than trusting the JWT claim (e.g. after a role change that hasn't propagated).
 */
export async function getUserRoleFromFirestore(
  uid: string
): Promise<UserRole | null> {
  const snap = await adminDb.collection("users").doc(uid).get();
  if (!snap.exists) return null;

  const role = snap.data()?.role;
  return isValidRole(role) ? role : null;
}