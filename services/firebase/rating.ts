import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type {
  CustomerRatingData,
  Rating,
  RatingCriteriaCustomer,
  RatingCriteriaWorker,
  RatingStatus,
  RatingTargetType,
  WorkerRatingData,
} from "@/services/firebase/types";
import {
  calculateCriteriaAverages,
  calculateDistribution,
  calculateWeightedAverage,
} from "@/utils/ratingCalculations";

export interface PendingRating {
  bookingId: string;
  ratedId: string;
  ratedType: RatingTargetType;
}

export interface SubmitRatingData {
  bookingId: string;
  ratedId: string;
  ratedType: RatingTargetType;
  overallRating: number;
  criteriaRatings: RatingCriteriaWorker | RatingCriteriaCustomer;
  reviewText: string;
  tags: string[];
}

function isValidRatingValue(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

function ratingDocId(bookingId: string, raterId: string): string {
  return `${bookingId}_${raterId}`;
}

function asRatingStatus(value: unknown): RatingStatus {
  return value === "auto_generated" || value === "removed" ? value : "submitted";
}

function normalizeCriteriaRatings(
  data: Record<string, unknown>,
  ratedType: RatingTargetType
): RatingCriteriaWorker | RatingCriteriaCustomer {
  const criteria = (data.criteriaRatings ?? {}) as Record<string, unknown>;

  if (ratedType === "customer") {
    return {
      behavior: Number(criteria.behavior ?? criteria.customerBehavior ?? 0),
      paymentPromptness: Number(criteria.paymentPromptness ?? 0),
      accessibility: Number(criteria.accessibility ?? 0),
      communication: Number(criteria.communication ?? 0),
    };
  }

  return {
    punctuality: Number(criteria.punctuality ?? 0),
    quality: Number(criteria.quality ?? 0),
    behavior: Number(criteria.behavior ?? 0),
    cleanliness: Number(criteria.cleanliness ?? 0),
    valueForMoney: Number(criteria.valueForMoney ?? 0),
  };
}

function toRating(id: string, data: Record<string, unknown>): Rating {
  const ratedType =
    data.ratedType === "customer" || data.ratedType === "worker" ? data.ratedType : "worker";
  return {
    id,
    bookingId: String(data.bookingId ?? ""),
    raterId: String(data.raterId ?? ""),
    raterType: data.raterType === "worker" ? "worker" : "customer",
    ratedId: String(data.ratedId ?? ""),
    ratedType,
    overallRating: Number(data.overallRating ?? 0),
    criteriaRatings: normalizeCriteriaRatings(data, ratedType),
    reviewText: String(data.reviewText ?? ""),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    status: asRatingStatus(data.status),
    createdAt: data.createdAt as Rating["createdAt"],
    updatedAt: data.updatedAt as Rating["updatedAt"],
  };
}

async function fetchRatingsByTarget(
  targetId: string,
  targetType: RatingTargetType
): Promise<Rating[]> {
  if (!targetId) return [];
  const snap = await getDocs(
    query(
      collection(db, "ratings"),
      where("ratedId", "==", targetId),
      where("ratedType", "==", targetType)
    )
  );

  return snap.docs
    .map((entry) => toRating(entry.id, entry.data() as Record<string, unknown>))
    .sort((a, b) => {
      const left =
        a.createdAt && typeof a.createdAt === "object" && "toMillis" in a.createdAt
          ? (a.createdAt as { toMillis: () => number }).toMillis()
          : 0;
      const right =
        b.createdAt && typeof b.createdAt === "object" && "toMillis" in b.createdAt
          ? (b.createdAt as { toMillis: () => number }).toMillis()
          : 0;
      return right - left;
    });
}

// ✅ submitRating now goes through API instead of direct Firestore
export async function submitRating(data: SubmitRatingData): Promise<void> {
  const currentUserId = auth.currentUser?.uid ?? "";
  if (!currentUserId) throw new Error("You must be signed in to submit a rating.");
  if (!data.bookingId.trim()) throw new Error("Booking id is required.");
  if (!data.ratedId.trim()) throw new Error("Rated user id is required.");
  if (!["customer", "worker"].includes(data.ratedType)) {
    throw new Error("Rated type is invalid.");
  }
  if (!isValidRatingValue(data.overallRating)) {
    throw new Error("Overall rating must be an integer between 1 and 5.");
  }

  const res = await fetch(`/api/bookings/${data.bookingId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      overallRating: data.overallRating,
      reviewText: data.reviewText,
      criteriaRatings: data.criteriaRatings,
      tags: data.tags,
    }),
  });

  if (res.status === 409) {
    throw new Error("A rating already exists for this booking.");
  }
  if (res.status === 403) {
    throw new Error("You are not allowed to rate this booking.");
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Failed to submit rating.");
  }
}

export async function getPendingRatings(
  userId: string,
  userType: "customer" | "worker"
): Promise<PendingRating[]> {
  if (!userId) return [];
  const bookingField = userType === "customer" ? "customerId" : "providerId";
  const ratedType: RatingTargetType = userType === "customer" ? "worker" : "customer";
  const bookingsSnap = await getDocs(
    query(
      collection(db, "bookings"),
      where(bookingField, "==", userId),
      where("status", "==", "completed"),
      firestoreLimit(100)
    )
  );

  const rows = await Promise.all(
    bookingsSnap.docs.map(async (bookingSnap) => {
      const ratingRef = doc(db, "ratings", ratingDocId(bookingSnap.id, userId));
      const ratingSnap = await getDoc(ratingRef);
      if (ratingSnap.exists()) return null;
      const booking = bookingSnap.data() as Record<string, unknown>;
      const ratedId = String(
        ratedType === "worker" ? (booking.providerId ?? "") : (booking.customerId ?? "")
      );
      return {
        bookingId: bookingSnap.id,
        ratedId,
        ratedType,
      } satisfies PendingRating;
    })
  );

  return rows.filter((item): item is PendingRating => Boolean(item?.bookingId));
}

export async function getWorkerRatings(workerId: string, limitCount = 20): Promise<Rating[]> {
  const snap = await getDocs(
    query(
      collection(db, "ratings"),
      where("ratedId", "==", workerId),
      where("ratedType", "==", "worker"),
      orderBy("createdAt", "desc"),
      firestoreLimit(limitCount)
    )
  );
  return snap.docs.map((entry) => toRating(entry.id, entry.data() as Record<string, unknown>));
}

export async function getCustomerRatings(customerId: string, limitCount = 20): Promise<Rating[]> {
  const snap = await getDocs(
    query(
      collection(db, "ratings"),
      where("ratedId", "==", customerId),
      where("ratedType", "==", "customer"),
      orderBy("createdAt", "desc"),
      firestoreLimit(limitCount)
    )
  );
  return snap.docs.map((entry) => toRating(entry.id, entry.data() as Record<string, unknown>));
}

export async function getWorkerRatingAggregate(workerId: string): Promise<WorkerRatingData> {
  const ratings = await fetchRatingsByTarget(workerId, "worker");
  const distribution = calculateDistribution(ratings);
  const criteriaAverages = calculateCriteriaAverages(ratings) as Partial<{
    punctuality: number;
    quality: number;
    behavior: number;
    cleanliness: number;
    valueForMoney: number;
  }>;
  return {
    averageRating: calculateWeightedAverage(ratings),
    totalRatings: ratings.length,
    distribution: {
      1: Number(distribution[1] ?? 0),
      2: Number(distribution[2] ?? 0),
      3: Number(distribution[3] ?? 0),
      4: Number(distribution[4] ?? 0),
      5: Number(distribution[5] ?? 0),
    },
    criteriaAverages: {
      punctuality: Number(criteriaAverages.punctuality ?? 0),
      quality: Number(criteriaAverages.quality ?? 0),
      behavior: Number(criteriaAverages.behavior ?? 0),
      cleanliness: Number(criteriaAverages.cleanliness ?? 0),
      valueForMoney: Number(criteriaAverages.valueForMoney ?? 0),
    },
  };
}

export async function getCustomerRatingAggregate(
  customerId: string
): Promise<CustomerRatingData> {
  const ratings = await fetchRatingsByTarget(customerId, "customer");
  const criteriaAverages = calculateCriteriaAverages(ratings) as Partial<{
    behavior: number;
    paymentPromptness: number;
    accessibility: number;
    communication: number;
  }>;
  return {
    averageRating: calculateWeightedAverage(ratings),
    totalRatings: ratings.length,
    criteriaAverages: {
      behavior: Number(criteriaAverages.behavior ?? 0),
      paymentPromptness: Number(criteriaAverages.paymentPromptness ?? 0),
      accessibility: Number(criteriaAverages.accessibility ?? 0),
      communication: Number(criteriaAverages.communication ?? 0),
    },
  };
}

export async function hasUserRatedBooking(
  bookingId: string,
  userId: string
): Promise<boolean> {
  if (!bookingId || !userId) return false;
  const snap = await getDoc(doc(db, "ratings", ratingDocId(bookingId, userId)));
  return snap.exists();
}

export const subscribeToWorkerRatings = (
  workerId: string,
  callback: (ratings: Rating[]) => void
): (() => void) => {
  const q = query(
    collection(db, "ratings"),
    where("ratedId", "==", workerId),
    where("ratedType", "==", "worker"),
    orderBy("createdAt", "desc"),
    firestoreLimit(20)
  );
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((entry) => toRating(entry.id, entry.data() as Record<string, unknown>))
    );
  });
};