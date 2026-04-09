import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken } from "@/lib/admin/auth";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

type RateLimitEntry = {
  count: number;
  firstAttemptAt: number;
  blockedUntil?: number;
};

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const BLOCK_MS = 15 * 60 * 1000;
const attemptsByIp = new Map<string, RateLimitEntry>();

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

function canAttempt(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = attemptsByIp.get(ip);
  if (!entry) return { allowed: true };

  if (entry.blockedUntil && now < entry.blockedUntil) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.blockedUntil - now) / 1000) };
  }

  if (now - entry.firstAttemptAt > WINDOW_MS) {
    attemptsByIp.delete(ip);
    return { allowed: true };
  }

  return { allowed: true };
}

function markFailure(ip: string) {
  const now = Date.now();
  const existing = attemptsByIp.get(ip);

  if (!existing || now - existing.firstAttemptAt > WINDOW_MS) {
    attemptsByIp.set(ip, { count: 1, firstAttemptAt: now });
    return;
  }

  const nextCount = existing.count + 1;
  if (nextCount >= MAX_ATTEMPTS) {
    attemptsByIp.set(ip, {
      count: nextCount,
      firstAttemptAt: existing.firstAttemptAt,
      blockedUntil: now + BLOCK_MS,
    });
    return;
  }

  attemptsByIp.set(ip, { ...existing, count: nextCount });
}

function clearAttempts(ip: string) {
  attemptsByIp.delete(ip);
}

function getAdminEmailAllowlist(): Set<string> {
  return new Set(
    String(process.env.ADMIN_EMAIL_ALLOWLIST ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
}

async function resolveAdminAccess(uid: string, tokenRole: string, tokenEmail: string, blocked: boolean): Promise<boolean> {
  if (tokenRole === "admin") {
    return true;
  }

  const normalizedEmail = tokenEmail.trim().toLowerCase();
  const allowlistedEmails = getAdminEmailAllowlist();
  if (normalizedEmail && allowlistedEmails.has(normalizedEmail)) {
    await adminAuth.setCustomUserClaims(uid, {
      role: "admin",
      blocked,
    });
    return true;
  }

  const userDoc = await adminDb.collection("users").doc(uid).get();
  if (userDoc.exists && String(userDoc.data()?.role ?? "") === "admin") {
    await adminAuth.setCustomUserClaims(uid, {
      role: "admin",
      blocked,
    });
    return true;
  }

  return false;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateState = canAttempt(ip);
  if (!rateState.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateState.retryAfterSeconds ?? 60),
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const body = (await request.json().catch(() => null)) as { idToken?: string } | null;
  const idToken = String(body?.idToken ?? "").trim();

  if (!idToken) {
    markFailure(ip);
    return NextResponse.json(
      { error: "Missing ID token." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken, true);
    const hasAdminAccess = await resolveAdminAccess(
      decoded.uid,
      String(decoded.role ?? ""),
      String(decoded.email ?? ""),
      Boolean(decoded.blocked)
    );

    if (!hasAdminAccess) {
      markFailure(ip);
      return NextResponse.json(
        { error: "Admin access denied." },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    const user = await adminAuth.getUser(decoded.uid);
    const token = await createAdminSessionToken({
      id: decoded.uid,
      name: user.displayName || user.email || "Admin",
      email: user.email || "",
      role: "admin",
      permissions: ["all"],
    });

    clearAttempts(ip);

    const response = NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } }
    );
    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch {
    markFailure(ip);
    return NextResponse.json(
      { error: "Invalid or expired session token." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }
}
