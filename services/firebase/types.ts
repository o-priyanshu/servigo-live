import type { BookingStatus, ServiceCategory } from "@/lib/types/index";
import type { Timestamp } from "firebase/firestore";

export type WorkerGender = "male" | "female" | "other" | "any";
export type WorkerAvailability = "online" | "offline" | "busy";
export type TrustBadge = "gold" | "silver" | "bronze";
export type RatingTargetType = "customer" | "worker";
export type RatingStatus = "submitted" | "auto_generated" | "removed";

export interface RatingCriteriaWorker {
  punctuality?: number;
  quality?: number;
  behavior?: number;
  cleanliness?: number;
  valueForMoney?: number;
}

export interface RatingCriteriaCustomer {
  behavior?: number;
  paymentPromptness?: number;
  accessibility?: number;
  communication?: number;
}

export interface Rating {
  id: string;
  bookingId: string;
  raterId: string;
  raterType: RatingTargetType;
  ratedId: string;
  ratedType: RatingTargetType;
  overallRating: number;
  criteriaRatings: RatingCriteriaWorker | RatingCriteriaCustomer;
  reviewText: string;
  tags: string[];
  status: RatingStatus;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface WorkerRatingData {
  averageRating: number;
  totalRatings: number;
  distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
  criteriaAverages: {
    punctuality: number;
    quality: number;
    behavior: number;
    cleanliness: number;
    valueForMoney: number;
  };
}

export interface CustomerRatingData {
  averageRating: number;
  totalRatings: number;
  criteriaAverages: {
    behavior: number;
    paymentPromptness: number;
    accessibility: number;
    communication: number;
  };
}

export interface Customer {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  referralCode?: string;
  subscriptionPlan?: "basic" | "family" | "premium";
  averageRating?: number;
  totalRatings?: number;
  criteriaAverages?: CustomerRatingData["criteriaAverages"];
  createdAt?: string;
  updatedAt?: string;
}

export interface Address {
  id: string;
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  lat: number;
  lng: number;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkerAddress {
  fullAddress: string;
  lat: number;
  lng: number;
  pincode: string;
}

export interface WorkerTrustBreakdown {
  badge: TrustBadge;
  verificationStatus: "verified" | "pending" | "rejected" | "suspended";
  jobsCompleted: number;
  referenceCount: number;
  cleanHistory: boolean;
  jobsInArea: number;
}

export interface Worker {
  id: string;
  name: string;
  photo: string;
  serviceCategory: ServiceCategory;
  gender: Exclude<WorkerGender, "any">;
  rating: number;
  reviewCount: number;
  averageRating?: number;
  totalRatings?: number;
  yearsOfExperience: number;
  serviceRadius?: number;
  baseRate: number;
  distanceKm: number;
  availability: WorkerAvailability;
  isVerified: boolean;
  isAvailableNow: boolean;
  skills: string[];
  location: {
    lat: number;
    lng: number;
    city: string;
    pincode?: string;
  };
  urgentEtaMinutes: number | null;
  jobsInArea: number;
  trust: WorkerTrustBreakdown;
  skillScores?: Record<string, number>;
}

export interface Review {
  id: string;
  bookingId: string;
  workerId: string;
  customerId: string;
  customerName?: string;
  rating: number;
  comment: string;
  createdAt?: string;
}

export interface Booking {
  id: string;
  customerId: string;
  providerId: string;
  serviceCategory: ServiceCategory;
  status: BookingStatus;
  scheduledAt: string;
  address: string;
  amount: number;
  safetyShield: boolean;
  payment: {
    status: "none" | "held" | "captured" | "refunded";
    holdAmount?: number;
    heldAt?: string;
    capturedAt?: string;
    refundedAt?: string;
  };
  jobPhotos?: string[];
  cancellationReason?: string;
  cancellationCharge?: number;
  serviceDeadlineAt?: string;
  completionRequestedAt?: string;
  completionRequestedBy?: string;
  completionApprovedAt?: string;
  extensionRequestedAt?: string;
  extensionRequestedBy?: string;
  requestedExtensionMinutes?: number;
  extensionApprovedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
}

export type NotificationType = "booking_update" | "promotion" | "safety" | "system";

export interface AppNotification {
  id: string;
  customerId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  bookingId?: string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

export type Notification = AppNotification;

export interface WorkerSkill {
  service: string;
  experience: number;
  skillScore: number;
}

export type WorkerVerificationStatus = "pending" | "verified" | "rejected" | "suspended";
export type WorkerTrustTier = "T1" | "T2" | "T3";

export interface WorkerProfile {
  uid: string;
  name: string;
  phone: string;
  email?: string;
  photoURL?: string;
  photo?: string;
  dateOfBirth?: string;
  gender: "male" | "female" | "other";
  serviceCategory?: ServiceCategory;
  yearsOfExperience?: number;
  hourlyRate?: number;
  address: WorkerAddress;
  serviceRadius: number;
  serviceablePincodes: string[];
  skills: WorkerSkill[];
  languages: string[];
  tools: string[];
  bio?: string;
  bankDetails: {
    accountName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    upiId?: string;
    panNumber?: string;
  };
  verificationStatus: WorkerVerificationStatus;
  verificationData: {
    aadhaarNumber: string;
    aadhaarFrontUrl: string;
    aadhaarBackUrl: string;
    selfieUrl: string;
    selfieCapturedDate?: string;
    policeCertificateUrl?: string;
    profilePhotoUrl?: string;
    referenceName?: string;
    referencePhone?: string;
    rejectedReason?: string;
    submittedAt?: Timestamp;
  };
  trustScore: number;
  trustTier: WorkerTrustTier;
  totalJobs: number;
  totalEarnings: number;
  rating: number;
  ratingCount: number;
  averageRating?: number;
  totalRatings?: number;
  ratingSum?: number;
  criteriaAverages?: WorkerRatingData["criteriaAverages"];
  ratingDistribution?: WorkerRatingData["distribution"];
  cancellationRate: number;
  responseRate: number;
  hubId?: string;
  isAvailable: boolean;
  currentLocation?: {
    lat: number;
    lng: number;
    lastUpdated: Timestamp;
  };
  location?: {
    lat: number;
    lng: number;
    city: string;
    pincode?: string;
  };
  availabilityConfig?: {
    weeklySlots?: Record<string, string[]>;
    emergencyAvailable?: boolean;
    vacationMode?: boolean;
  };
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface WorkerRegistrationData {
  uid?: string;
  name: string;
  phone: string;
  email?: string;
  gender: "male" | "female" | "other";
  dateOfBirth?: string;
  address: WorkerAddress;
  serviceRadius: number;
  serviceablePincodes: string[];
  skills: WorkerSkill[];
  languages: string[];
  tools: string[];
  bankDetails: WorkerProfile["bankDetails"];
  verificationData: {
    aadhaarNumber: string;
    aadhaarFrontUrl: string;
    aadhaarBackUrl: string;
    selfieUrl: string;
    selfieCapturedDate?: string;
    policeCertificateUrl?: string;
    profilePhotoUrl?: string;
    referenceName?: string;
    referencePhone?: string;
  };
}

export interface JobRequest {
  id: string;
  workerId: string;
  bookingId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: WorkerAddress;
  customerRating: number;
  service: string;
  description: string;
  photos: string[];
  scheduledTime: Timestamp;
  estimatedPrice: number;
  distance: number;
  status: "pending" | "accepted" | "declined" | "expired";
  expiresAt: Timestamp;
  createdAt: Timestamp;
}

export type WorkerJobStatus =
  | "accepted"
  | "on_way"
  | "arrived"
  | "working"
  | "completion_requested"
  | "extension_requested"
  | "completed"
  | "cancelled";

export interface WorkerJob {
  id: string;
  bookingId: string;
  workerId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: WorkerAddress;
  service: string;
  description: string;
  photos: string[];
  scheduledTime: Timestamp;
  actualStartTime?: Timestamp;
  actualEndTime?: Timestamp;
  completionRequestedAt?: Timestamp;
  extensionRequestedAt?: Timestamp;
  requestedExtensionMinutes?: number;
  status: WorkerJobStatus;
  price: {
    base: number;
    commission: number;
    net: number;
  };
  paymentStatus: "held" | "released";
  statusHistory?: {
    status: WorkerJobStatus;
    at: Timestamp;
  }[];
  entryPhoto?: string;
  exitPhoto?: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface WorkerEarning {
  id: string;
  workerId: string;
  jobId: string;
  amount: number;
  commission: number;
  net: number;
  status: "held" | "released";
  releasedAt?: Timestamp;
  createdAt: Timestamp;
}

export interface WorkerWithdrawal {
  id: string;
  workerId: string;
  amount: number;
  method: "bank" | "upi";
  status: "pending" | "processing" | "completed" | "failed";
  transactionId?: string;
  requestedAt: Timestamp;
  completedAt?: Timestamp;
}

export type WorkerNotificationType =
  | "new_job"
  | "job_accepted"
  | "job_completed"
  | "payment_released"
  | "verification_status"
  | "system";

export interface WorkerNotification {
  id: string;
  workerId: string;
  type: WorkerNotificationType;
  title: string;
  message: string;
  read: boolean;
  bookingId?: string;
  jobId?: string;
  createdAt?: Timestamp;
  metadata?: Record<string, unknown>;
}

export interface LocationSelection {
  lat: number;
  lng: number;
  pincode: string;
  address: string;
}
