/**
 * @file lib/onboarding-schemas.ts
 *
 * Zod schemas for onboarding form validation.
 * Client-safe: used in both frontend forms and Server Actions.
 *
 * Note: File validation (instanceof File) is intentionally avoided here
 * since it breaks in server/Node.js contexts. File uploads are validated
 * separately in the upload layer before persisting document URLs.
 */

import { z } from "zod";

// ─── Identity Step ────────────────────────────────────────────────────────────

export const identitySchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be under 100 characters"),

  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .refine((val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, "Invalid date format")
    .refine((val) => {
      const date = new Date(val);
      const now = new Date();
      // Must be at least 18 years old
      const minAge = new Date(
        now.getFullYear() - 18,
        now.getMonth(),
        now.getDate()
      );
      return date <= minAge;
    }, "You must be at least 18 years old")
    .refine((val) => {
      const date = new Date(val);
      const now = new Date();
      // Sanity cap — no one is older than 120
      const maxAge = new Date(
        now.getFullYear() - 120,
        now.getMonth(),
        now.getDate()
      );
      return date >= maxAge;
    }, "Invalid date of birth"),

  gender: z.enum(["male", "female", "other", "prefer-not-to-say"]).refine(
    (val) => val !== undefined,
    "Please select a gender"
  ),
});

// ─── Role Step ────────────────────────────────────────────────────────────────

/**
 * Only "user" and "provider" are selectable during onboarding.
 * "admin" is assigned programmatically only — never exposed to users.
 */
export const roleSchema = z.object({
  role: z.enum(["user", "provider"]).refine(
    (val) => val !== undefined,
    "Please select a role"
  ),
});

// ─── Verification Steps ───────────────────────────────────────────────────────

/**
 * Provider verification — File fields are string paths after upload.
 * Validate the actual File objects in your upload component before calling
 * the Server Action, then pass the resulting storage paths here.
 */
export const providerVerificationSchema = z.object({
  // Storage paths after upload — not raw File objects
  governmentIdPath: z
    .string()
    .min(1, "Government ID upload is required"),
  serviceCategory: z
    .string()
    .min(1, "Please select a service category"),
});

export const customerVerificationSchema = z.object({
  primaryInterest: z
    .string()
    .min(1, "Please select your primary interest"),
});

// ─── File Validation (client-only helper) ─────────────────────────────────────

/**
 * Use this in your upload component BEFORE uploading to your file provider.
 * Do NOT use z.instanceof(File) in shared schemas — it breaks server-side.
 */
export const fileUploadSchema = z.object({
  file: z
    .custom<File>(
      (val) => typeof window !== "undefined" && val instanceof File,
      "Please select a file"
    )
    .refine(
      (f) => f.size <= 10 * 1024 * 1024,
      "File must be under 10MB"
    )
    .refine(
      (f) => ["image/jpeg", "image/png", "application/pdf"].includes(f.type),
      "File must be a JPEG, PNG, or PDF"
    ),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type IdentityData = z.infer<typeof identitySchema>;
export type RoleData = z.infer<typeof roleSchema>;
export type ProviderVerificationData = z.infer<typeof providerVerificationSchema>;
export type CustomerVerificationData = z.infer<typeof customerVerificationSchema>;

/**
 * Discriminated union on `role` — TypeScript can now narrow the type correctly:
 *
 * if (data.role === "provider") {
 *   data.governmentIdPath // ✅ TypeScript knows this exists
 * }
 */
export type OnboardingData =
  | (IdentityData & { role: "provider" } & ProviderVerificationData)
  | (IdentityData & { role: "user" } & CustomerVerificationData);
