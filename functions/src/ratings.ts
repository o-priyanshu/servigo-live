import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, type DocumentReference } from "firebase-admin/firestore";

initializeApp();

const db = getFirestore();

type RatingTargetType = "customer" | "worker";

function isValidScore(value: unknown): value is number {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

function ratingFieldPath(targetType: RatingTargetType): string {
  return targetType === "worker" ? "providers" : "users";
}

function getLegacyAverage(data: Record<string, unknown>): { sum: number; count: number } {
  const storedSum = Number(data.ratingSum ?? 0);
  const storedCount = Number(data.totalRatings ?? data.reviewCount ?? data.ratingCount ?? 0);
  if (typeof data.ratingSum !== "undefined") {
    return { sum: storedSum, count: storedCount };
  }

  const legacyAverage = Number(data.averageRating ?? data.rating ?? 0);
  return {
    sum: legacyAverage * storedCount,
    count: storedCount,
  };
}

async function recalculateTargetAggregate(ref: DocumentReference, targetType: RatingTargetType) {
  const snap = await ref.get();
  if (!snap.exists) return;

  const data = snap.data() ?? {};
  const ratingSum = Number(data.ratingSum ?? 0);
  const totalRatings = Number(data.totalRatings ?? data.reviewCount ?? data.ratingCount ?? 0);
  const averageRating = totalRatings > 0 ? ratingSum / totalRatings : Number(data.averageRating ?? data.rating ?? 0);
  const criteriaTotals = (data.criteriaTotals ?? {}) as Record<string, unknown>;
  const criteriaCounts = (data.criteriaCounts ?? {}) as Record<string, unknown>;
  const criteriaAverages = Object.fromEntries(
    Object.keys(criteriaTotals).map((key) => {
      const count = Number(criteriaCounts[key] ?? 0);
      const total = Number(criteriaTotals[key] ?? 0);
      return [key, count > 0 ? Number((total / count).toFixed(2)) : 0];
    })
  );

  const payload: Record<string, unknown> = {
    averageRating: Number(averageRating.toFixed(2)),
    totalRatings,
    rating: Number(averageRating.toFixed(2)),
    reviewCount: totalRatings,
    ratingCount: totalRatings,
    criteriaAverages,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (targetType === "worker") {
    payload.distribution = data.distribution ?? data.ratingDistribution ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    payload.ratingDistribution = payload.distribution;
  }

  await ref.update(payload);
}

function buildTargetUpdate(
  rating: Record<string, unknown>,
  targetType: RatingTargetType
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    totalRatings: FieldValue.increment(1),
    ratingSum: FieldValue.increment(Number(rating.overallRating ?? 0)),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const criteria = (rating.criteriaRatings ?? {}) as Record<string, unknown>;
  const readCriteriaValue = (key: string): unknown => {
    if (targetType === "customer" && key === "behavior") {
      return criteria.behavior ?? criteria.customerBehavior;
    }
    return criteria[key];
  };
  const criteriaTotals: Record<string, string> =
    targetType === "worker"
      ? {
          punctuality: "punctuality",
          quality: "quality",
          behavior: "behavior",
          cleanliness: "cleanliness",
          valueForMoney: "valueForMoney",
        }
      : {
          behavior: "behavior",
          paymentPromptness: "paymentPromptness",
          accessibility: "accessibility",
          communication: "communication",
        };

  Object.entries(criteriaTotals).forEach(([field, key]) => {
    const value = readCriteriaValue(key);
    if (isValidScore(value)) {
      payload[`criteriaTotals.${field}`] = FieldValue.increment(value);
      payload[`criteriaCounts.${field}`] = FieldValue.increment(1);
    }
  });

  if (targetType === "worker") {
    const score = Math.max(1, Math.min(5, Math.round(Number(rating.overallRating ?? 0))));
    payload[`distribution.${score}`] = FieldValue.increment(1);
    payload[`ratingDistribution.${score}`] = FieldValue.increment(1);
  }

  return payload;
}

async function applyRatingToTarget(
  targetId: string,
  targetType: RatingTargetType,
  rating: Record<string, unknown>
): Promise<void> {
  if (!targetId) return;
  const collectionName = ratingFieldPath(targetType);
  const ref = db.collection(collectionName).doc(targetId);
  const snap = await ref.get();
  const legacy = snap.exists ? (snap.data() ?? {}) : {};
  const legacyTotals = getLegacyAverage(legacy);

  if (typeof legacy.ratingSum === "undefined" && legacyTotals.count > 0) {
    await ref.set(
      {
        ratingSum: legacyTotals.sum,
        totalRatings: legacyTotals.count,
        reviewCount: legacyTotals.count,
        ratingCount: legacyTotals.count,
        averageRating: legacyTotals.count > 0 ? Number((legacyTotals.sum / legacyTotals.count).toFixed(2)) : 0,
        rating: legacyTotals.count > 0 ? Number((legacyTotals.sum / legacyTotals.count).toFixed(2)) : 0,
      },
      { merge: true }
    );
  }

  await ref.set(
    {
      ...buildTargetUpdate(rating, targetType),
      ratingSum: FieldValue.increment(Number(rating.overallRating ?? 0)),
      totalRatings: FieldValue.increment(1),
    },
    { merge: true }
  );

  const current = await ref.get();
  if (!current.exists) return;

  const currentData = current.data() ?? {};
  const currentCount = Number(currentData.totalRatings ?? currentData.reviewCount ?? currentData.ratingCount ?? 0);
  const currentSum = Number(currentData.ratingSum ?? 0);
  const averageRating = currentCount > 0 ? currentSum / currentCount : 0;

  const nextPayload: Record<string, unknown> = {
    averageRating: Number(averageRating.toFixed(2)),
    totalRatings: currentCount,
    rating: Number(averageRating.toFixed(2)),
    reviewCount: currentCount,
    ratingCount: currentCount,
    updatedAt: FieldValue.serverTimestamp(),
  };

  const criteriaTotals = (currentData.criteriaTotals ?? {}) as Record<string, unknown>;
  const criteriaCounts = (currentData.criteriaCounts ?? {}) as Record<string, unknown>;
  const criteriaAverages = Object.fromEntries(
    Object.keys(criteriaTotals).map((key) => {
      const count = Number(criteriaCounts[key] ?? 0);
      const total = Number(criteriaTotals[key] ?? 0);
      return [key, count > 0 ? Number((total / count).toFixed(2)) : 0];
    })
  );
  nextPayload.criteriaAverages = criteriaAverages;

  await ref.set(nextPayload, { merge: true });
}

export const onRatingCreated = onDocumentCreated("ratings/{ratingId}", async (event) => {
  const rating = event.data?.data() as Record<string, unknown> | undefined;
  if (!rating) return;
  if (String(rating.status ?? "") !== "submitted") return;

  const overallRating = Number(rating.overallRating ?? 0);
  if (!isValidScore(overallRating)) return;

  const ratedType = String(rating.ratedType ?? "") as RatingTargetType;
  const targetType = ratedType === "customer" ? "customer" : "worker";
  const targetId = String(rating.ratedId ?? "");
  if (!targetId) return;

  await applyRatingToTarget(targetId, targetType, rating);
});
