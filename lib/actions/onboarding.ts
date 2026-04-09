"use server";

import { adminDb } from "@/lib/firebase-admin";
import { requireSessionUser } from "../server/session";
import type { OnboardingIdentity, VerificationData } from "@/app/onboarding/page";

export async function completeOnboarding({
  identity,
  verification,
}: {
  identity: OnboardingIdentity;
  verification: VerificationData;
}) {
  // Server-side auth — cannot be spoofed from the client
  const sessionUser = await requireSessionUser();

  const payload = {
    ...identity,
    verification,
    isProfileComplete: true,
    onboardedAt: new Date().toISOString(),
  };

  await adminDb
    .collection("users")
    .doc(sessionUser.uid)
    .set(payload, { merge: true });
}
