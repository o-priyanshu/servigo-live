import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
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
  Booking,
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

function normalizeTags(tags: string[]): string[] {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean))).slice(0, 8);
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

function validateCriteria(criteria: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(criteria)) {
    if (!isValidRatingValue(value)) {
      throw new Error(`Criteria rating "${key}" must be an integer between 1 and 5.`);
    }
  }
}

function toRating(id: string, data: Record<string, unknown>): Rating {
  const ratedType = data.ratedType === "customer" || data.ratedType === "worker" ? data.ratedType : "worker";
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

async function fetchRatingsByTarget(targetId: string, targetType: RatingTargetType): Promise<Rating[]> {
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
      const left = a.createdAt && typeof a.createdAt === "object" && "toMillis" in a.createdAt
        ? (a.createdAt as { toMillis: () => number }).toMillis()
        : 0;
      const right = b.createdAt && typeof b.createdAt === "object" && "toMillis" in b.createdAt
        ? (b.createdAt as { toMillis: () => number }).toMillis()
        : 0;
      return right - left;
    });
}

async function getBookingOrThrow(bookingId: string): Promise<Booking> {
  const snap = await getDoc(doc(db, "bookings", bookingId));
  if (!snap.exists()) throw new Error("Booking not found.");
  return snap.data() as Booking;
}

export async function submitRating(data: SubmitRatingData): Promise<void> {
  const currentUserId = auth.currentUser?.uid ?? "";
  if (!currentUserId) throw new Error("You must be signed in to submit a rating.");
  if (!data.bookingId.trim()) throw new Error("Booking id is required.");
  if (!data.ratedId.trim()) throw new Error("Rated user id is required.");
  if (!["customer", "worker"].includes(data.ratedType)) throw new Error("Rated type is invalid.");
  if (!isValidRatingValue(data.overallRating)) {
    throw new Error("Overall rating must be an integer between 1 and 5.");
  }
  validateCriteria(data.criteriaRatings as Record<string, unknown>);
  if (data.reviewText.trim().length > 2000) {
    throw new Error("Review text must be 2000 characters or fewer.");
  }

  const booking = await getBookingOrThrow(data.bookingId);
  if (String(booking.status ?? "") !== "completed") {
    throw new Error("Ratings can only be created for completed bookings.");
  }

  const bookingCustomerId = String(booking.customerId ?? "");
  const bookingWorkerId = String(booking.providerId ?? "");
  const isCustomerRater = currentUserId === bookingCustomerId;
  const isWorkerRater = currentUserId === bookingWorkerId;
  if (!isCustomerRater && !isWorkerRater) {
    throw new Error("You can only rate a booking you participated in.");
  }

  const raterType: RatingTargetType = isCustomerRater ? "customer" : "worker";
  const expectedRatedType: RatingTargetType = raterType === "customer" ? "worker" : "customer";
  const expectedRatedId = expectedRatedType === "worker" ? bookingWorkerId : bookingCustomerId;

  if (data.ratedType !== expectedRatedType) {
    throw new Error("Rated type does not match the booking participant.");
  }
  if (data.ratedId !== expectedRatedId) {
    throw new Error("Rated user does not match the booking participant.");
  }
  const ref = doc(db, "ratings", ratingDocId(data.bookingId, currentUserId));
  const existing = await getDoc(ref);
  if (existing.exists()) {
    throw new Error("A rating already exists for this booking.");
  }

  const payload: Record<string, unknown> = {
    bookingId: data.bookingId,
    raterId: currentUserId,
    raterType,
    ratedId: data.ratedId,
    ratedType: data.ratedType,
    overallRating: data.overallRating,
    criteriaRatings: data.criteriaRatings,
    reviewText: data.reviewText.trim(),
    tags: normalizeTags(data.tags),
    status: "submitted",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, payload, { merge: false });
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
      const ratedId = String(ratedType === "worker" ? booking.providerId ?? "" : booking.customerId ?? "");
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

export async function getCustomerRatingAggregate(customerId: string): Promise<CustomerRatingData> {
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

export async function hasUserRatedBooking(bookingId: string, userId: string): Promise<boolean> {
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
    callback(snap.docs.map((entry) => toRating(entry.id, entry.data() as Record<string, unknown>)));
  });
};
