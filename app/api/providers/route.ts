import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import type { ServiceCategory } from "@/lib/types/index";
import { ensureLocalSeedProviders, ensureSeedProviders } from "@/lib/server/provider-seed";
import { normalizeProviderDisplayName } from "@/lib/server/provider-display";
import { getProviderProfileImage } from "@/lib/profile-image";

type SortBy = "recommended" | "nearest" | "rating" | "price";

interface ProviderListItem {
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
  location: { city: string };
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseSortBy(value: string | null): SortBy {
  if (value === "nearest" || value === "rating" || value === "price") return value;
  return "recommended";
}

function parseNumber(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseBool(value: string | null): boolean {
  return value === "true";
}

function parseCategory(value: string | null): ServiceCategory | "All" {
  if (!value || value === "All") return "All";
  const allowed: ServiceCategory[] = [
    "electrician",
    "plumber",
    "cleaner",
    "carpenter",
    "appliance_repair",
  ];
  return allowed.includes(value as ServiceCategory) ? (value as ServiceCategory) : "All";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = parseCategory(searchParams.get("category"));
    const radiusKm = parseNumber(searchParams.get("radiusKm"));
    const lat = parseNumber(searchParams.get("lat"));
    const lng = parseNumber(searchParams.get("lng"));
    const onlineOnly = parseBool(searchParams.get("onlineOnly"));
    const verifiedOnly = parseBool(searchParams.get("verifiedOnly"));
    const sortBy = parseSortBy(searchParams.get("sortBy"));
    const search = (searchParams.get("search") ?? "").trim().toLowerCase();

    // dummy data
    // if (process.env.NODE_ENV !== "production") {
    //   await ensureSeedProviders();
    //   if (lat !== null && lng !== null) {
    //     await ensureLocalSeedProviders(lat, lng);
    //   }
    // }

    const providersSnap = await adminDb
      .collection("providers")
      .where("verificationStatus", "==", "verified")
      .limit(200)
      .get();

    const userRefs = providersSnap.docs.map((docSnap) =>
      adminDb.collection("users").doc(docSnap.id)
    );
    const userDocs =
      userRefs.length > 0 ? await adminDb.getAll(...userRefs) : [];
    const userNameById = new Map<string, string>();
    for (const userDoc of userDocs) {
      const data = userDoc.data() ?? {};
      userNameById.set(userDoc.id, String(data.name ?? "Provider"));
    }

    const items: ProviderListItem[] = providersSnap.docs.map((docSnap) => {
      const data = docSnap.data() ?? {};
      const location = (data.location ?? {}) as { lat?: number; lng?: number; city?: string };
      const verificationData = (data.verificationData ?? {}) as {
        profilePhotoUrl?: string;
        selfieUrl?: string;
      };
      const pLat = Number(location.lat ?? 0);
      const pLng = Number(location.lng ?? 0);
      const canComputeDistance =
        lat !== null &&
        lng !== null &&
        Number.isFinite(pLat) &&
        Number.isFinite(pLng) &&
        (pLat !== 0 || pLng !== 0);
      const distance = canComputeDistance ? haversineKm(lat, lng, pLat, pLng) : Number(data.distanceKm ?? 999);

      const categoryValue = String(data.serviceCategory ?? "electrician") as ServiceCategory;
      const normalizedName = normalizeProviderDisplayName(
        userNameById.get(docSnap.id) ?? "",
        categoryValue,
        docSnap.id
      );

      return {
        id: docSnap.id,
        name: normalizedName,
        photo: getProviderProfileImage({
          providerId: docSnap.id,
          providerName: normalizedName,
          category: categoryValue,
          photo:
            String(data.photo ?? "") ||
            String(verificationData.profilePhotoUrl ?? "") ||
            String(verificationData.selfieUrl ?? ""),
        }),
        category: categoryValue,
        isOnline: data.isAvailable === true,
        isVerified: String(data.verificationStatus ?? "") === "verified",
        rating: Number(Number(data.averageRating ?? data.rating ?? 0).toFixed(1)),
        reviewCount: Number(data.totalRatings ?? data.reviewCount ?? 0),
        averageRating: Number(Number(data.averageRating ?? data.rating ?? 0).toFixed(1)),
        totalRatings: Number(data.totalRatings ?? data.reviewCount ?? 0),
        experienceYears: Number(data.yearsOfExperience ?? 0),
        distanceKm: Number(distance.toFixed(1)),
        serviceRadiusKm: Number(data.serviceRadius ?? 0),
        hourlyRate: Math.max(100, Number(data.hourlyRate ?? 450)),
        skills: Array.isArray(data.skills)
          ? data.skills
              .map((s: unknown) => {
                if (typeof s === "string") return s;
                if (s && typeof s === "object") {
                  return String((s as { service?: unknown }).service ?? "");
                }
                return "";
              })
              .filter(Boolean)
              .slice(0, 6)
          : [],
        location: {
          city: String(location.city ?? ""),
        },
      };
    });

    const filtered = items
      .filter((p) => (category === "All" ? true : p.category === category))
      .filter((p) => (onlineOnly ? p.isOnline : true))
      .filter((p) => (verifiedOnly ? p.isVerified : true))
      .filter((p) => (radiusKm !== null && lat !== null && lng !== null ? p.distanceKm <= radiusKm : true))
      .filter((p) => {
        if (!search) return true;
        const hay = `${p.name} ${p.category} ${p.skills.join(" ")}`.toLowerCase();
        return hay.includes(search);
      })
      .sort((a, b) => {
        if (sortBy === "nearest") return a.distanceKm - b.distanceKm;
        if (sortBy === "rating") return b.rating - a.rating;
        if (sortBy === "price") return a.hourlyRate - b.hourlyRate;
        const scoreA = a.rating * 100 + a.reviewCount - a.distanceKm;
        const scoreB = b.rating * 100 + b.reviewCount - b.distanceKm;
        return scoreB - scoreA;
      });

    return NextResponse.json({ providers: filtered });
  } catch (error: unknown) {
    console.error("[Providers] GET list failed:", error);
    return NextResponse.json({ error: "Failed to load providers" }, { status: 500 });
  }
}
