/**
 * @file services/firebase/worker.ts
 * INDUSTRIAL VERSION: High-performance Provider Mapping & Location-based Filtering.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit as firestoreLimit,
  query,
  orderBy,
  setDoc,
  where,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import type { ServiceCategory } from "@/lib/types/index";
import { db } from "@/lib/firebase";
import type { Review, Worker } from "@/services/firebase/types";
import {
  DEFAULT_SEARCH_RADIUS_KM,
  inferTrustBadge,
  toIsoString,
} from "@/services/firebase/utils";

type ProviderApiListItem = {
  id: string;
  name: string;
  photo: string;
  category: ServiceCategory;
  isOnline: boolean;
  isVerified: boolean;
  rating: number;
  reviewCount: number;
  averageRating?: number;
  totalRatings?: number;
  experienceYears: number;
  distanceKm: number;
  serviceRadiusKm: number;
  hourlyRate: number;
  skills: string[];
  location?: { city?: string };
};

type ProviderApiDetail = {
  id: string;
  name: string;
  photo: string;
  serviceCategory: ServiceCategory;
  bio?: string;
  yearsOfExperience?: number;
  serviceAreaRadiusKm?: number;
  verificationStatus?: string;
  isAvailable?: boolean;
  rating?: number;
  reviewCount?: number;
  averageRating?: number;
  totalRatings?: number;
  location?: { city?: string } | null;
};

// --- FIX 6: Proper VerificationStatus union type instead of `as any` --------

/**
 * FETCH NEARBY WORKERS
 *
 * Strategy:
 *   1. Query Firestore with hard filters (verified, service, availability).
 *   2. Filter by haversine distance locally (Firestore has no native radius query).
 *   3. FIX 3: Batch-fetch user docs for distance-passing providers only,
 *      instead of firing N individual getDoc calls upfront.
 *
 * NOTE (FIX 4): The 100-doc Firestore limit means providers beyond that window
 * may be missed. Upgrade to geohash-based querying (geofire-common) for V2.
 */
export const getWorkersNearby = async (
  lat: number,
  lng: number,
  radiusKm: number = DEFAULT_SEARCH_RADIUS_KM,
  filters?: {
    minRating?: number;
    service?: string;
    gender?: string;
    availableOnly?: boolean;
  }
): Promise<Worker[]> => {
  const searchParams = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radiusKm: String(radiusKm),
    verifiedOnly: "true",
  });
  if (filters?.availableOnly) searchParams.set("onlineOnly", "true");
  if (filters?.service) searchParams.set("category", filters.service);

  const res = await fetch(`/api/providers?${searchParams.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to load nearby workers.");
  }

  const payload = (await res.json().catch(() => ({}))) as { providers?: unknown };
  const workers = (Array.isArray(payload.providers) ? payload.providers : [])
    .filter(
      (item): item is ProviderApiListItem => item !== null && typeof item === "object"
    )
    .map((provider) => ({
      id: provider.id,
      name: provider.name,
      photo: provider.photo,
      serviceCategory: provider.category,
      gender: "other" as const,
      rating: Number(provider.averageRating ?? provider.rating ?? 0),
      reviewCount: Number(provider.totalRatings ?? provider.reviewCount ?? 0),
      averageRating: Number(provider.averageRating ?? provider.rating ?? 0),
      totalRatings: Number(provider.totalRatings ?? provider.reviewCount ?? 0),
      yearsOfExperience: Number(provider.experienceYears ?? 0),
      serviceRadius: Number(provider.serviceRadiusKm ?? 0),
      baseRate: Number(provider.hourlyRate ?? 450),
      distanceKm: Number(provider.distanceKm ?? 0),
      availability: provider.isOnline ? ("online" as const) : ("offline" as const),
      isVerified: provider.isVerified === true,
      isAvailableNow: provider.isOnline === true,
      skills: Array.isArray(provider.skills) ? provider.skills.map(String) : [],
      jobsInArea: 0,
      location: {
        lat: 0,
        lng: 0,
        city: String(provider.location?.city ?? "Unknown"),
        pincode: "",
      },
      urgentEtaMinutes:
        provider.isOnline === true
          ? Math.max(15, Math.round(Number(provider.distanceKm ?? 0) * 8))
          : null,
      trust: {
        badge: inferTrustBadge(
          Math.min(
            100,
            Math.max(
              35,
              (provider.isVerified ? 40 : 10) +
                Math.min(30, Number(provider.reviewCount ?? 0) * 0.5) +
                (Number(provider.rating ?? 0) >= 4.5 ? 20 : 0)
            )
          )
        ),
        verificationStatus: provider.isVerified ? ("verified" as const) : ("pending" as const),
        jobsCompleted: Number(provider.reviewCount ?? 0),
        referenceCount: 0,
        cleanHistory: true,
        jobsInArea: 0,
      },
    }))
    .filter((w) => (filters?.minRating ? w.rating >= filters.minRating : true))
    .filter((w) =>
      filters?.gender && filters.gender !== "any" ? w.gender === filters.gender : true
    )
    .filter((w) => (filters?.availableOnly ? w.isAvailableNow : true))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return workers;
};

export const getWorkerById = async (workerId: string): Promise<Worker> => {
  const res = await fetch(`/api/providers/${encodeURIComponent(workerId)}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Worker not found.");
  }
  const payload = (await res.json().catch(() => null)) as ProviderApiDetail | null;
  if (!payload?.id) throw new Error("Worker not found.");

  return {
    id: payload.id,
    name: payload.name,
    photo: payload.photo,
    serviceCategory: payload.serviceCategory,
    gender: "other",
    rating: Number(payload.averageRating ?? payload.rating ?? 0),
    reviewCount: Number(payload.totalRatings ?? payload.reviewCount ?? 0),
    averageRating: Number(payload.averageRating ?? payload.rating ?? 0),
    totalRatings: Number(payload.totalRatings ?? payload.reviewCount ?? 0),
    yearsOfExperience: Number(payload.yearsOfExperience ?? 0),
    serviceRadius: Number(payload.serviceAreaRadiusKm ?? 0),
    baseRate: 450,
    distanceKm: 0,
    location: {
      lat: 0,
      lng: 0,
      city: String(payload.location?.city ?? "Unknown"),
      pincode: "",
    },
    availability: payload.isAvailable ? ("online" as const) : ("offline" as const),
    isVerified: String(payload.verificationStatus ?? "") === "verified",
    isAvailableNow: payload.isAvailable === true,
    skills: [],
    urgentEtaMinutes: null,
    jobsInArea: 0,
    trust: {
      badge: inferTrustBadge(50),
      verificationStatus:
        String(payload.verificationStatus ?? "") === "verified"
          ? ("verified" as const)
          : ("pending" as const),
      jobsCompleted: Number(payload.reviewCount ?? 0),
      referenceCount: 0,
      cleanHistory: true,
      jobsInArea: 0,
    },
  };
};

// --- Availability -------------------------------------------------------------

export const updateWorkerAvailability = async (
  workerId: string,
  status: boolean
): Promise<void> => {
  const ref = doc(db, "providers", workerId);
  await updateDoc(ref, {
    isAvailable: status,
    availabilityStatus: status ? "online" : "offline",
    updatedAt: serverTimestamp(),
  });
};

// --- Reviews ------------------------------------------------------------------

export const getWorkerReviews = async (
  workerId: string,
  limitCount = 10
): Promise<Review[]> => {
  const q = query(
    collection(db, "reviews"),
    where("providerId", "==", workerId),
    orderBy("createdAt", "desc"),   // FIX 1: orderBy now imported and works correctly
    firestoreLimit(limitCount)
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      bookingId: data.bookingId,
      workerId: data.providerId,
      customerId: data.customerId,
      rating: data.rating,
      comment: data.comment,
      createdAt: toIsoString(data.createdAt),
    };
  });
};

// --- Favorites ----------------------------------------------------------------

export const toggleFavorite = async (
  customerId: string,
  workerId: string,
  isFavorite: boolean
): Promise<void> => {
  const favRef = doc(db, "users", customerId, "favorites", workerId);
  if (isFavorite) {
    await setDoc(favRef, { workerId, createdAt: serverTimestamp() });
  } else {
    await deleteDoc(favRef);
  }
};

export const addToFavorites = async (
  customerId: string,
  workerId: string
): Promise<void> => {
  await toggleFavorite(customerId, workerId, true);
};

export const removeFromFavorites = async (
  customerId: string,
  workerId: string
): Promise<void> => {
  await toggleFavorite(customerId, workerId, false);
};

export const getFavorites = async (customerId: string): Promise<Worker[]> => {
  const favSnap = await getDocs(collection(db, "users", customerId, "favorites"));
  const ids = favSnap.docs.map((entry) => entry.id).filter(Boolean);
  if (ids.length === 0) return [];

  const workers = await Promise.all(
    ids.map(async (workerId) => {
      try {
        const worker = await getWorkerById(workerId);
        return { ...worker, distanceKm: 0 };
      } catch {
        return null;
      }
    })
  );

  return workers.filter(Boolean) as Worker[];
};

export const getWorkerJobsInArea = async (): Promise<number> => {
  return 0;
};
