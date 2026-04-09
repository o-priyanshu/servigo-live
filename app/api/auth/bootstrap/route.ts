import { NextResponse } from "next/server";
import { upsertUserFromIdToken } from "@/lib/server/auth-user";

// ─── Input Validation ─────────────────────────────────────────────────────────

interface BootstrapInput {
  idToken: string;
  fullName?: string;
  provider?: string;
  deviceId?: string;
  roleIntent?: "user" | "provider" | "admin";
}

function validateBootstrapInput(body: unknown): BootstrapInput | null {
  if (typeof body !== "object" || body === null) return null;

  const b = body as Record<string, unknown>;
  const { idToken, fullName, provider, deviceId } = b;
  const rawRoleIntent = b.roleIntent;

  if (typeof idToken !== "string" || !idToken.trim()) return null;

  return {
    idToken,
    fullName:
      typeof fullName === "string" ? fullName.trim().slice(0, 100) : undefined,
    provider:
      typeof provider === "string" ? provider.trim().slice(0, 50) : undefined,
    deviceId:
      typeof deviceId === "string" ? deviceId.trim().slice(0, 128) : undefined,
    roleIntent:
      rawRoleIntent === "provider" || rawRoleIntent === "user" || rawRoleIntent === "admin"
        ? rawRoleIntent
        : undefined,
  };
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const input = validateBootstrapInput(body);

    if (!input) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const xff = request.headers.get("x-forwarded-for");
    const ip = xff?.split(",")[0]?.trim() || undefined;

    const result = await upsertUserFromIdToken({ ...input, ip });

    if (result.isBlocked) {
      return NextResponse.json(
        { error: "Account suspended" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      status: "ok",
      emailVerified: result.emailVerified,
      role: result.role,
      isProfileComplete: result.isProfileComplete,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "Authenticated user email is missing.") {
        return NextResponse.json(
          { error: "Account has no email address" },
          { status: 422 }
        );
      }
    }

    console.error("[Bootstrap] Unexpected error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 401 }
    );
  }
}
