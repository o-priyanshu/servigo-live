/**
 * @file services/firebase/worker.ts
 * INDUSTRIAL VERSION: High-performance Provider Mapping & Location-based Filtering.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  query,
  orderBy,
  type QueryConstraint,
  setDoc,
  where,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import type { ServiceCategory } from "@/lib/types/index";
import { db } from "@/lib/firebase";
import type { Review, Worker, WorkerGender } from "@/services/firebase/types";
import {
  DEFAULT_SEARCH_RADIUS_KM,
  asNumber,
  asString,
  extractPincodeFromText,
  haversineKm,
  inferTrustBadge,
  normalizePincode,
  toIsoString,
} from "@/services/firebase/utils";

// --- FIX 6: Proper VerificationStatus union type instead of `as any` --------

type VerificationStatus = "verified" | "pending" | "rejected" | "suspended";
type AvailabilityStatus = "online" | "offline" | "busy";

function asVerificationStatus(value: unknown): VerificationStatus {
  const valid: VerificationStatus[] = ["verified", "pending", "rejected", "suspended"];
  const val = String(value ?? "pending").toLowerCase() as VerificationStatus;
  return valid.includes(val) ? val : "pending";
}

function asAvailabilityStatus(value: unknown, fallbackOnline: boolean): AvailabilityStatus {
  const status = String(value ?? "").toLowerCase();
  if (status === "online" || status === "offline" || status === "busy") {
    return status;
  }
  return fallbackOnline ? "online" : "offline";
}

// --- Industrial Type Converters -----------------------------------------------

function asServiceCategory(value: unknown): ServiceCategory {
  const valid: ServiceCategory[] = ["electrician", "plumber", "cleaner", "carpenter", "appliance_repair"];
  const val = String(value ?? "").toLowerCase() as ServiceCategory;
  return valid.includes(val) ? val : "electrician";
}

function asGender(value: unknown): Exclude<WorkerGender, "any"> {
  const gender = String(value ?? "other").toLowerCase();
  if (gender === "male" || gender === "female") return gender;
  return "other";
}

// --- Core Mapping Logic (Industrial Performance) -----------------------------

async function mapWorker(
  providerId: string,
  providerData: Record<string, unknown>,
  distanceKm: number
): Promise<Worker | null> {
  try {
    const location = (providerData.location ?? {}) as Record<string, unknown>;
    const stats = {
      completed: asNumber(providerData.completedJobs, 0),
      reviews: asNumber(providerData.reviewCount, 0),
      rating: asNumber(providerData.rating, 0),
    };
    const availability = asAvailabilityStatus(
      providerData.availabilityStatus,
      providerData.isAvailable === true
    );
    const verificationData = (providerData.verificationData ?? {}) as Record<string, unknown>;
    const profilePhoto =
      asString(providerData.photo, "") ||
      asString(verificationData.profilePhotoUrl, "") ||
      asString(verificationData.selfieUrl, "");

    // FIX 6: Use typed converter instead of raw string + `as any`
    const vStatus = asVerificationStatus(providerData.verificationStatus);

    // Industrial Trust Score Algorithm (Weight-based)
    const trustScore = Math.min(
      100,
      Math.max(
        35,
        (vStatus === "verified" ? 40 : 10) +
          Math.min(30, stats.completed * 2) +
          (stats.rating >= 4.5 ? 20 : 0) +
          (providerData.referenceCount ? 10 : 0)
      )
    );

    return {
      id: providerId,
      // IMPORTANT: customer clients usually cannot read users/{providerId} by rules.
      // Use provider doc fields to avoid permission-denied on discovery lists.
      name: asString(providerData.name, "Provider"),
      photo: profilePhoto,
      serviceCategory: asServiceCategory(providerData.serviceCategory),
      gender: asGender(providerData.gender),
      rating: Number(stats.rating.toFixed(1)),
      reviewCount: stats.reviews,
      yearsOfExperience: asNumber(providerData.yearsOfExperience, 0),
      serviceRadius: asNumber(providerData.serviceRadius, 0),
      baseRate: Math.max(100, asNumber(providerData.hourlyRate, 450)),
      distanceKm: Number(distanceKm.toFixed(2)),
      availability,
      isVerified: vStatus === "verified",
      isAvailableNow: availability === "online",
      skills: Array.isArray(providerData.skills)
        ? providerData.skills
            .map((skill) => {
              if (typeof skill === "string") return skill;
              if (skill && typeof skill === "object") {
                return asString((skill as Record<string, unknown>).service, "");
              }
              return "";
            })
            .filter(Boolean)
        : [],
      jobsInArea: 0,
      location: {
        lat: asNumber(location.lat, 0),
        lng: asNumber(location.lng, 0),
        city: asString(location.city, "Unknown"),
        pincode: asString(location.pincode, ""),
      },
      urgentEtaMinutes: availability === "online" || availability === "busy"
        ? Math.max(15, Math.round(distanceKm * 8))
        : null,
      trust: {
        badge: inferTrustBadge(trustScore),
        verificationStatus: vStatus,           // FIX 6: Now fully typed, no `as any`
        jobsCompleted: stats.completed,
        referenceCount: asNumber(providerData.referenceCount, 0),
        cleanHistory: !providerData.hasActiveViolations,
        jobsInArea: 0,
      },
    };
  } catch (err) {
    // FIX 5: Re-throw non-mapping errors so callers can distinguish
    // partial failures from empty results. Only swallow map-shape errors.
    if (err instanceof TypeError || err instanceof RangeError) {
      console.error(`[WorkerService] Data shape error for ${providerId}:`, err);
      return null;
    }
    // Network / permission errors bubble up to the caller
    throw err;
  }
}

// --- Exported Actions ---------------------------------------------------------

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
  const providersRef = collection(db, "providers");
  const constraints: QueryConstraint[] = [
    where("verificationStatus", "==", "verified"),
  ];

  if (filters?.availableOnly) constraints.push(where("isAvailable", "==", true));
  if (filters?.service) constraints.push(where("serviceCategory", "==", filters.service));

  const snap = await getDocs(query(providersRef, ...constraints, firestoreLimit(100)));

  // --- Distance-filter first -----------------------------------------------

  // Step 1: Filter by distance without any Firestore reads
  const nearby = snap.docs
    .map((d) => {
      const data = d.data() as Record<string, unknown>;
      const loc = (data.location ?? {}) as Record<string, unknown>;
      const distance = haversineKm(lat, lng, asNumber(loc.lat, 0), asNumber(loc.lng, 0));
      return distance <= radiusKm ? { id: d.id, data, distance } : null;
    })
    .filter((entry): entry is { id: string; data: Record<string, unknown>; distance: number } =>
      entry !== null
    );

  // Step 2: Map all nearby providers
  // FIX 5: Use allSettled so one bad provider doc doesn't abort the whole list
  const settled = await Promise.allSettled(
    nearby.map(({ id, data, distance }) => mapWorker(id, data, distance))
  );

  const workers: Worker[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled" && result.value !== null) {
      workers.push(result.value);
    } else if (result.status === "rejected") {
      console.error("[WorkerService] mapWorker rejected:", result.reason);
    }
  }

  return workers
    .filter((w) => (filters?.minRating ? w.rating >= filters.minRating : true))
    .filter((w) =>
      filters?.gender && filters.gender !== "any" ? w.gender === filters.gender : true
    )
    .filter((w) => (filters?.availableOnly ? w.isAvailableNow : true))
    .sort((a, b) => a.distanceKm - b.distanceKm);
};

export const getWorkerById = async (workerId: string): Promise<Worker> => {
  const providerSnap = await getDoc(doc(db, "providers", workerId));
  if (!providerSnap.exists()) {
    throw new Error("Worker not found.");
  }

  const providerData = providerSnap.data() as Record<string, unknown>;
  const location = (providerData.location ?? {}) as Record<string, unknown>;
  const mapped = await mapWorker(workerId, providerData, 0);
  if (!mapped) {
    throw new Error("Failed to map worker profile.");
  }

  return {
    ...mapped,
    distanceKm: 0,
    location: {
      lat: asNumber(location.lat, 0),
      lng: asNumber(location.lng, 0),
      city: asString(location.city, "Unknown"),
      pincode: asString(location.pincode, ""),
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
      const providerSnap = await getDoc(doc(db, "providers", workerId));
      if (!providerSnap.exists()) return null;
      const data = providerSnap.data() as Record<string, unknown>;
      const loc = (data.location ?? {}) as Record<string, unknown>;
      const mapped = await mapWorker(workerId, data, 0);
      return mapped
        ? {
            ...mapped,
            distanceKm: 0,
            location: {
              lat: asNumber(loc.lat, 0),
              lng: asNumber(loc.lng, 0),
              city: asString(loc.city, "Unknown"),
              pincode: asString(loc.pincode, ""),
            },
          }
        : null;
    })
  );

  return workers.filter(Boolean) as Worker[];
};

export const getWorkerJobsInArea = async (
  workerId: string,
  pincode: string
): Promise<number> => {
  const normalized = normalizePincode(pincode);
  if (!normalized) return 0;

  const snap = await getDocs(
    query(
      collection(db, "workerJobs"),
      where("workerId", "==", workerId),
      where("status", "==", "completed"),
      where("customerAddress.pincode", "==", normalized),
      firestoreLimit(200)
    )
  );
  return snap.size;
};
