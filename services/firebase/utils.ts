import type { Timestamp } from "firebase/firestore";

export const DEFAULT_SEARCH_RADIUS_KM = 10;
export const CANCELLATION_WINDOW_MS = 60 * 60 * 1000;

export function toIsoString(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  const maybeTimestamp = value as Timestamp & { toDate?: () => Date };
  if (typeof maybeTimestamp.toDate === "function") {
    return maybeTimestamp.toDate().toISOString();
  }
  return undefined;
}

export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizePincode(input: string): string | null {
  const onlyDigits = input.replace(/\D/g, "");
  if (onlyDigits.length < 6) return null;
  return onlyDigits.slice(0, 6);
}

export function extractPincodeFromText(input: string): string | null {
  const match = input.match(/\b(\d{6})\b/);
  return match ? match[1] : null;
}

export function isValidLatLng(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function assertValidLatLng(lat: number, lng: number): void {
  if (!isValidLatLng(lat, lng)) {
    throw new Error("Address must include valid lat/lng coordinates.");
  }
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function inferTrustBadge(score: number): "gold" | "silver" | "bronze" {
  if (score >= 85) return "gold";
  if (score >= 70) return "silver";
  return "bronze";
}
