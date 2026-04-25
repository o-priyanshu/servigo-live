export type VerificationStatus = "pending" | "verified" | "rejected";

export type ProviderCategory =
  | "electrician"
  | "plumber"
  | "cleaner"
  | "carpenter"
  | "appliance_repair";

export type JobStatus =
  | "incoming"
  | "accepted"
  | "on_the_way"
  | "in_progress"
  | "waiting_customer"
  | "extension_requested"
  | "completed"
  | "cancelled";

export interface Provider {
  id: string;
  role: "provider";
  name: string;
  phone: string;
  email: string;
  city: string;
  category: ProviderCategory;
  radiusKm: number;
  yearsOfExperience: number;
  rating: number;
  reviewCount: number;
  verificationStatus: VerificationStatus;
  isOnline: boolean;
  bio: string;
  services: string[];
  emergencyAvailable: boolean;
}

export interface Job {
  id: string;
  bookingId?: string;
  customerName: string;
  serviceType: string;
  description: string;
  address: string;
  city: string;
  distanceKm: number;
  scheduledAtIso: string;
  paymentEstimateInr: number;
  status: JobStatus;
  canMessage: boolean;
  customerPhone: string;
  customerRating?: number;
  expiresAtMs?: number;
}

export interface Earnings {
  totalInr: number;
  todayInr: number;
  monthInr: number;
  commissionPercent: number;
  netPayoutInr: number;
  weeklyTrendInr: number[];
}
