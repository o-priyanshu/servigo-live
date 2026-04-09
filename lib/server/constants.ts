/**
 * @file lib/server/constants.ts
 *
 * Single source of truth for auth-related types, roles, routes, and cookie names.
 * Imported by firebase-admin.ts, session.ts, and middleware.ts to prevent drift.
 */

// ─── Roles ────────────────────────────────────────────────────────────────────

export const USER_ROLES = ["user", "provider", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export function isValidRole(value: unknown): value is UserRole {
  return USER_ROLES.includes(value as UserRole);
}

export function normalizeRole(value: unknown): UserRole {
  return isValidRole(value) ? value : "user";
}

// ─── Cookie ───────────────────────────────────────────────────────────────────

/** The session cookie name used by Firebase session cookie auth */
export const SESSION_COOKIE_NAME = "__session" as const;

// ─── Routes ───────────────────────────────────────────────────────────────────

/** Redirect destination after successful login */
export const DEFAULT_AUTHENTICATED_REDIRECT = "/dashboard" as const;

/** Login page — used in redirects when auth fails */
export const LOGIN_PATH = "/auth/login" as const;

/** Blocked user page */
export const BLOCKED_PATH = "/blocked" as const;

/** Unauthorized (wrong role) page */
export const UNAUTHORIZED_PATH = "/unauthorized" as const;

/** Auth pages — logged-in users should be redirected away from these */
export const AUTH_BASE_PATHS = ["/auth"] as const;

// ─── Request Headers (set by middleware, read by server components) ────────────

/**
 * Headers forwarded by middleware after successful JWT verification.
 * Read these in server components / route handlers instead of re-verifying.
 */
export const VERIFIED_USER_ID_HEADER = "x-user-id" as const;
export const VERIFIED_USER_ROLE_HEADER = "x-user-role" as const;

// ─── Custom JWT Claims ────────────────────────────────────────────────────────

/**
 * Custom claim key used to block a user.
 * Must be set explicitly in your Firebase custom claims:
 *   await adminAuth.setCustomUserClaims(uid, { blocked: true })
 */
export const BLOCKED_CLAIM_KEY = "blocked" as const;

/**
 * Custom claim key for the user's role.
 *   await adminAuth.setCustomUserClaims(uid, { role: "admin" })
 */
export const ROLE_CLAIM_KEY = "role" as const;