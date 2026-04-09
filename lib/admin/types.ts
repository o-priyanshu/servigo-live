export type VerificationStatus = "pending" | "verified" | "rejected" | "suspended";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "fraud_flagged";

export type AccountStatus = "active" | "warned" | "suspended";

export type AdminRole = "admin" | "sub_admin";

export type ServiceCategory =
  | "electrician"
  | "plumber"
  | "cleaner"
  | "carpenter"
  | "appliance_repair";

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  permissions: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "user" | "provider" | "admin";
  totalBookings: number;
  reportsFiled: number;
  accountStatus: AccountStatus;
  city: string;
  createdAt: string;
}

export interface ProviderDocumentSet {
  idDocumentUrl: string;
  selfieUrl: string;
  policeCertificateUrl?: string;
}

export interface FraudFlag {
  id: string;
  reason: string;
  severity: "low" | "medium" | "high" | "critical";
  createdAt: string;
  resolved: boolean;
}

export interface Provider {
  id: string;
  name: string;
  email: string;
  category: ServiceCategory;
  city: string;
  verificationStatus: VerificationStatus;
  rating: number;
  joinDate: string;
  accountStatus: AccountStatus;
  earningsThisMonth: number;
  activeBookings: number;
  aiVerificationResult: "pass" | "manual_review" | "fail";
  complaintHistoryCount: number;
  documents: ProviderDocumentSet;
  fraudFlags: FraudFlag[];
}

export interface BookingTimelineEvent {
  at: string;
  title: string;
  description: string;
}

export interface BookingChatMessage {
  id: string;
  sender: "customer" | "provider" | "system";
  text: string;
  at: string;
}

export interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  providerId: string;
  providerName: string;
  service: string;
  category: ServiceCategory;
  status: BookingStatus;
  amount: number;
  city: string;
  createdAt: string;
  scheduledAt: string;
  commissionPercent: number;
  cancellationHistory: string[];
  disputeNotes: string[];
  timeline: BookingTimelineEvent[];
  chatPreview: BookingChatMessage[];
  fraudFlags: FraudFlag[];
}

export interface Report {
  id: string;
  targetType: "provider" | "user";
  targetId: string;
  targetName: string;
  reason: string;
  severity: "low" | "medium" | "high" | "critical";
  date: string;
  status: "open" | "under_investigation" | "dismissed";
}

export interface AdminAuditLog {
  id: string;
  adminName: string;
  action: string;
  entityType: "provider" | "user" | "booking" | "report" | "settings";
  entityId: string;
  createdAt: string;
}

export interface AnalyticsSeriesPoint {
  label: string;
  value: number;
}

export interface AdminSettings {
  commissionPercentage: number;
  emergencyBookingFee: number;
  providerVisibilityRadiusKm: number;
  fraudAutoSuspendThreshold: number;
  fraudManualReviewThreshold: number;
  subAdmins: Admin[];
}

