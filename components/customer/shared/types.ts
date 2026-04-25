import type { BookingStatus, ServiceCategory } from "@/lib/types/index";

export type RadiusOption = 1 | 3 | 5 | 10;

export interface CustomerProvider {
  id: string;
  name: string;
  photo: string;
  category: ServiceCategory;
  isOnline: boolean;
  availabilityStatus?: "online" | "offline" | "busy";
  isVerified: boolean;
  rating: number;
  reviewCount: number;
  averageRating?: number;
  totalRatings?: number;
  experienceYears: number;
  distanceKm: number;
  serviceRadiusKm?: number;
  hourlyRate?: number;
  skills?: string[];
  jobsInArea?: number;
  urgentEtaMinutes?: number | null;
  isFavorite?: boolean;
}

export interface CustomerBookingCardData {
  id: string;
  providerId?: string;
  providerName: string;
  providerPhoto: string;
  serviceCategory: ServiceCategory;
  status: BookingStatus;
  scheduledAt: string;
  address?: string;
  durationHours?: number;
  amount?: number;
}
