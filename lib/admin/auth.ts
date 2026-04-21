import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Admin, AdminRole } from "@/lib/admin/types";

export const ADMIN_SESSION_COOKIE = "servigo_admin_session";

interface AdminTokenPayload {
  sub: string;
  email: string;
  role: AdminRole;
  name: string;
  permissions: string[];
}

const encoder = new TextEncoder();
function getAdminSecret(): Uint8Array | null {
  const raw = process.env.ADMIN_JWT_SECRET?.trim();
  if (!raw || raw.length < 32) {
    console.error(
      "[Admin Auth] ADMIN_JWT_SECRET is missing or too short. Admin sessions are disabled."
    );
    return null;
  }
  return encoder.encode(raw);
}

export async function createAdminSessionToken(admin: Admin): Promise<string> {
  const secret = getAdminSecret();
  if (!secret) {
    throw new Error("Admin session secret is not configured.");
  }
  return await new SignJWT({
    email: admin.email,
    role: admin.role,
    name: admin.name,
    permissions: admin.permissions,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(admin.id)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
}

export async function verifyAdminSessionToken(token: string): Promise<AdminTokenPayload | null> {
  const secret = getAdminSecret();
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.name !== "string" ||
      !Array.isArray(payload.permissions)
    ) {
      return null;
    }

    const role = payload.role as AdminRole;
    if (role !== "admin" && role !== "sub_admin") {
      return null;
    }

    const permissions = payload.permissions
      .map((value) => String(value))
      .filter(Boolean);

    return {
      sub: payload.sub,
      email: payload.email,
      role,
      name: payload.name,
      permissions,
    };
  } catch {
    return null;
  }
}

export async function getAdminSessionFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminSessionToken(token);
}

export async function requireAdminSession() {
  const session = await getAdminSessionFromCookies();
  if (!session || session.role !== "admin") {
    return null;
  }
  return session;
}

