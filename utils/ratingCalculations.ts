import type { Rating } from "@/services/firebase/types";

export const calculateWeightedAverage = (ratings: Rating[]): number => {
  if (ratings.length === 0) return 0;

  const recent = ratings.slice(0, 10);
  const medium = ratings.slice(10, 30);
  const old = ratings.slice(30, 50);

  let total = 0;
  let weight = 0;

  recent.forEach((rating) => {
    total += rating.overallRating * 1.5;
    weight += 1.5;
  });
  medium.forEach((rating) => {
    total += rating.overallRating * 1.0;
    weight += 1.0;
  });
  old.forEach((rating) => {
    total += rating.overallRating * 0.5;
    weight += 0.5;
  });

  return weight > 0 ? total / weight : 0;
};

export const calculateDistribution = (ratings: Rating[]) => {
  return ratings.reduce(
    (acc, rating) => {
      const score = Math.max(1, Math.min(5, Math.round(rating.overallRating))) as 1 | 2 | 3 | 4 | 5;
      acc[score] += 1;
      return acc;
    },
    { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  );
};

export const calculateCriteriaAverages = (ratings: Rating[]) => {
  const totals: Record<string, number> = {};
  const counts: Record<string, number> = {};

  for (const rating of ratings) {
    const criteria = rating.criteriaRatings as Record<string, unknown>;
    for (const [key, value] of Object.entries(criteria)) {
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      totals[key] = (totals[key] ?? 0) + value;
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }

  return Object.fromEntries(
    Object.keys(totals).map((key) => [key, Number((totals[key] / counts[key]).toFixed(2))])
  );
};
