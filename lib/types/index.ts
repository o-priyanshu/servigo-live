/**
 * @file lib/types/index.ts
 *
 * Shared domain types for the ServiGo application.
 * UserRole is imported from constants — never redefined here.
 */

import type { Timestamp } from "firebase-admin/firestore";
import type { UserRole } from "@/lib/server/constants";

// Re-export so consumers can import everything from one place
export type { UserRole };

// ─── Enums / Union Types ──────────────────────────────────────────────────────

export type ProviderVerificationStatus =
  | "pending"
  | "verified"
  | "rejected"
  | "suspended";

export type BookingStatus =
  | "pending"      // matches createBooking action initial status
  | "confirmed"
  | "in_progress"
  | "awaiting_customer_confirmation"
  | "extension_requested"
  | "completed"
  | "cancelled";

/**
 * Moderation state of a provider profile.
 * Stored as a string in Firestore — matches Firestore rule:
 *   request.resource.data.moderation == "none"
 */
export type ModerationStatus =
  | "none"
  | "under_review"
  | "flagged"
  | "cleared";

/**
 * Named verification level — avoids magic numbers.
 * Level 1: ID + Selfie verified
 * Level 2: Level 1 + Police certificate verified
 */
export type VerificationLevel = 1 | 2;

// ─── Timestamp Handling ───────────────────────────────────────────────────────

/**
 * Firestore returns Timestamp objects server-side but ISO strings
 * when serialized to the client. Use this union at boundaries.
 */
export type FirestoreTimestamp = Timestamp | string;

// ─── User ─────────────────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole; // ✅ imported from constants — single source of truth
  emailVerified: boolean;
  isBlocked: boolean;
  isProfileComplete: boolean;
  createdAt: FirestoreTimestamp;
  lastLogin: FirestoreTimestamp;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export type ServiceCategory =
  | "electrician"
  | "plumber"
  | "cleaner"
  | "carpenter"
  | "appliance_repair";

export interface ProviderProfile {
  uid: string;
  serviceCategory: ServiceCategory;
  bio: string;
  yearsOfExperience: number;
  verificationStatus: ProviderVerificationStatus;
  verificationLevel: VerificationLevel;
  verificationBadge: boolean;
  serviceAreaRadiusKm: number;
  isAvailable: boolean;
  rating: number | null;       // null until first review
  reviewCount: number;
  completedJobs: number;
  documents: {
    idProofPath: string;
    selfiePath: string;
    policeCertificatePath?: string;
  };
  location: {
    lat: number;
    lng: number;
    city: string;
    geohash?: string;
  };
  fraudFlags: {
    repeatedComplaints: boolean;
    highCancellationRate: boolean;
  };
  /**
   * Stored as a ModerationStatus string — matches Firestore rules and
   * registerProviderProfile action which sets moderation: "none" on create.
   */
  moderation: ModerationStatus;
  moderationMeta?: {
    lastReviewedBy?: string;
    lastReviewedAt?: FirestoreTimestamp;
    rejectionReason?: string;
  };
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

// ─── Booking ──────────────────────────────────────────────────────────────────

export interface Booking {
  id: string;
  customerId: string;
  providerId: string;
  serviceCategory: ServiceCategory; // typed — was loose string
  status: BookingStatus;
  scheduledAt: string;              // ISO 8601 — always a string
  address: string;
  amount: number;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface Payment {
  id: string;
  bookingId: string;
  customerId: string;
  workerId: string;
  orderId?: string;
  paymentId?: string;
  amount: number;
  currency?: string;
  status: "created" | "processing" | "paid" | "failed" | "refunded";
  method?: string;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

// ─── Report ───────────────────────────────────────────────────────────────────

export type ReportStatus = "open" | "investigating" | "resolved";

export interface Report {
  id: string;
  bookingId: string;
  reporterId: string;
  reportedUserId: string;
  reason: string;
  details: string;
  status: ReportStatus;
  createdAt: FirestoreTimestamp;
}
