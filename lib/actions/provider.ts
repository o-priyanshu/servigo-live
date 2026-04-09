"use server";

/**
 * @file lib/actions/provider.ts
 *
 * Server Action for registering a provider profile.
 * Runs server-side and enforces session + role checks.
 */

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { SERVICE_CATEGORIES, type ServiceCategory } from "@/lib/provider/constants";
import { requireSessionUser } from "@/lib/server/session";

export interface RegisterProviderInput {
  serviceCategory: ServiceCategory;
  bio: string;
  yearsOfExperience: number;
  serviceAreaRadiusKm: number;
  location: {
    lat: number;
    lng: number;
    city: string;
  };
  documents: {
    idProofPath: string;
    selfiePath: string;
    policeCertificatePath?: string;
  };
}

export interface RegisterProviderResult {
  providerId: string;
  verificationStatus: "pending";
}

function validateProviderInput(input: RegisterProviderInput): string | null {
  if (!SERVICE_CATEGORIES.includes(input.serviceCategory)) {
    return "Invalid service category.";
  }

  const bio = input.bio?.trim();
  if (!bio || bio.length < 20) {
    return "Bio must be at least 20 characters.";
  }
  if (bio.length > 1000) {
    return "Bio must be under 1000 characters.";
  }

  if (
    typeof input.yearsOfExperience !== "number" ||
    input.yearsOfExperience < 0 ||
    input.yearsOfExperience > 60
  ) {
    return "Years of experience must be between 0 and 60.";
  }

  if (
    typeof input.serviceAreaRadiusKm !== "number" ||
    input.serviceAreaRadiusKm < 1 ||
    input.serviceAreaRadiusKm > 500
  ) {
    return "Service area radius must be between 1 and 500 km.";
  }

  const { lat, lng, city } = input.location ?? {};
  if (typeof lat !== "number" || lat < -90 || lat > 90) {
    return "Invalid latitude.";
  }
  if (typeof lng !== "number" || lng < -180 || lng > 180) {
    return "Invalid longitude.";
  }
  if (!city?.trim()) {
    return "City is required.";
  }

  if (!input.documents?.idProofPath?.trim()) {
    return "ID proof document is required.";
  }
  if (!input.documents?.selfiePath?.trim()) {
    return "Selfie document is required.";
  }

  return null;
}

export async function registerProviderProfile(
  input: RegisterProviderInput
): Promise<RegisterProviderResult> {
  const sessionUser = await requireSessionUser();

  if (sessionUser.role !== "provider") {
    throw new Error("Only provider accounts can register a provider profile.");
  }

  const validationError = validateProviderInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const providerRef = adminDb.collection("providers").doc(sessionUser.uid);
  const userRef = adminDb.collection("users").doc(sessionUser.uid);

  await providerRef.set(
    {
      uid: sessionUser.uid,
      serviceCategory: input.serviceCategory,
      bio: input.bio.trim(),
      yearsOfExperience: input.yearsOfExperience,
      serviceAreaRadiusKm: input.serviceAreaRadiusKm,
      location: input.location,
      documents: input.documents,
      verificationStatus: "pending",
      moderation: "none",
      isAvailable: false,
      rating: null,
      reviewCount: 0,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await userRef.set(
    {
      role: "provider",
      isProfileComplete: true,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return {
    providerId: sessionUser.uid,
    verificationStatus: "pending",
  };
}
