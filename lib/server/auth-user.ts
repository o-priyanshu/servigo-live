import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { normalizeRole, type UserRole } from "@/lib/server/constants";

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "10minutemail.com",
  "guerrillamail.com",
  "tempmail.com",
  "yopmail.com",
  "sharklasers.com",
]);

const FRAUD_DEVICE_THRESHOLD = 3;

interface UpsertOptions {
  idToken: string;
  fullName?: string;
  provider?: string;
  deviceId?: string;
  ip?: string;
  roleIntent?: "user" | "provider";
}

interface StoredUser {
  isBlocked?: boolean;
  role?: string;
  isProfileComplete?: boolean;
  fraudFlags?: {
    disposableEmail?: boolean;
    multiSignupDevice?: boolean;
  };
}

export interface UpsertResult {
  uid: string;
  isBlocked: boolean;
  emailVerified: boolean;
  role: UserRole;
  isProfileComplete: boolean;
}

const normalizeName = (name: string | undefined, fallback: string): string => {
  const clean = (name ?? "").trim().replace(/\s+/g, " ");
  return clean.length >= 2 ? clean.slice(0, 100) : fallback;
};

const extractEmailDomain = (email: string): string => {
  const at = email.lastIndexOf("@");
  return at > -1 ? email.slice(at + 1).toLowerCase() : "";
};

const ipHash = (ip: string): string =>
  createHash("sha256")
    .update(`${process.env.AUTH_FRAUD_SALT ?? "servigo-default-salt"}:${ip}`)
    .digest("hex");

export const upsertUserFromIdToken = async ({
  idToken,
  fullName,
  provider,
  deviceId,
  ip,
  roleIntent,
}: UpsertOptions): Promise<UpsertResult> => {
  const decoded = await adminAuth.verifyIdToken(idToken, false);
  const userRecord = await adminAuth.getUser(decoded.uid);

  if (!userRecord.email) {
    throw new Error("Authenticated user email is missing.");
  }

  const email = userRecord.email.toLowerCase();
  const emailDomain = extractEmailDomain(email);
  const isDisposableEmail = DISPOSABLE_DOMAINS.has(emailDomain);
  const providerId = provider ?? userRecord.providerData[0]?.providerId ?? "password";
  const now = FieldValue.serverTimestamp();
  const userRef = adminDb.collection("users").doc(decoded.uid);

  let multiSignupDevice = false;

  if (deviceId) {
    const deviceRef = adminDb.collection("security_signals").doc(`device_${deviceId}`);
    const deviceSnap = await deviceRef.get();
    const previousCount = Number(deviceSnap.data()?.signupCount ?? 0);
    multiSignupDevice = previousCount >= FRAUD_DEVICE_THRESHOLD;
    await deviceRef.set(
      {
        signupCount: previousCount + 1,
        uids: FieldValue.arrayUnion(decoded.uid),
        lastSeenAt: now,
      },
      { merge: true }
    );
  }

  if (ip) {
    const ipRef = adminDb.collection("security_signals").doc(`ip_${ipHash(ip)}`);
    await ipRef.set(
      { signupCount: FieldValue.increment(1), lastSeenAt: now },
      { merge: true }
    );
  }

  const existing = await userRef.get();
  const current = (existing.data() ?? {}) as StoredUser;

  const isBlocked = Boolean(current.isBlocked);
  let role = normalizeRole(current.role);
  let isProfileComplete = Boolean(current.isProfileComplete);

  // ✅ Only block role conflict for EXISTING users
  if (existing.exists) {
    if (roleIntent === "provider" && role === "user") {
      throw new Error("ROLE_CONFLICT: This email is already registered as a customer. Please use a different email to register as a provider.");
    }
    if (roleIntent === "user" && role === "provider") {
      throw new Error("ROLE_CONFLICT: This email is already registered as a provider. Please use a different email to sign up as a customer.");
    }
  }

  if (role === "provider" && !isProfileComplete) {
    const providerSnap = await adminDb.collection("providers").doc(decoded.uid).get();
    if (providerSnap.exists) {
      isProfileComplete = true;
    }
  }

  const updatedFraudFlags = {
    disposableEmail: current.fraudFlags?.disposableEmail === true || isDisposableEmail,
    multiSignupDevice: current.fraudFlags?.multiSignupDevice === true || multiSignupDevice,
  };

  const status = isBlocked
    ? "blocked"
    : userRecord.emailVerified
    ? "active"
    : "pending_verification";

  const sharedPayload = {
    uid: decoded.uid,
    name: normalizeName(fullName ?? userRecord.displayName ?? undefined, "ServiGo User"),
    email,
    emailVerified: Boolean(userRecord.emailVerified),
    lastLogin: now,
    authProviders: FieldValue.arrayUnion(providerId),
    fraudFlags: updatedFraudFlags,
    status,
  };

  // ✅ New user — create fresh document with correct role
  if (!existing.exists) {
    const newRole: UserRole = roleIntent === "provider" ? "provider" : "user";
    await userRef.set({
      ...sharedPayload,
      role: newRole,
      isBlocked: false,
      createdAt: now,
      isProfileComplete: false,
    });
    await adminAuth.setCustomUserClaims(decoded.uid, {
      role: newRole,
      blocked: false,
    });
    return {
      uid: decoded.uid,
      isBlocked: false,
      emailVerified: Boolean(userRecord.emailVerified),
      role: newRole,
      isProfileComplete: false,
    };
  }

  // ✅ Existing user — update without changing role
  await userRef.set(
    { ...sharedPayload, role, isProfileComplete },
    { merge: true }
  );

  await adminAuth.setCustomUserClaims(decoded.uid, {
    role,
    blocked: isBlocked,
  });

  return {
    uid: decoded.uid,
    isBlocked,
    emailVerified: Boolean(userRecord.emailVerified),
    role,
    isProfileComplete,
  };
};