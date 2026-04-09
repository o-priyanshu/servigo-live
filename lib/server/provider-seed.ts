import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

type SeedProvider = {
  id: string;
  name: string;
  email: string;
  serviceCategory: "electrician" | "plumber" | "cleaner" | "carpenter" | "appliance_repair";
  bio: string;
  yearsOfExperience: number;
  hourlyRate: number;
  rating: number;
  reviewCount: number;
  lat: number;
  lng: number;
  city: string;
  skills: string[];
  photo: string;
};

const SEED_PROVIDERS: SeedProvider[] = [
  {
    id: "seed_provider_electrician_1",
    name: "Rajesh Kumar",
    email: "rajesh.electrician@servigo.test",
    serviceCategory: "electrician",
    bio: "Certified electrician for home wiring, MCB and emergency repairs.",
    yearsOfExperience: 8,
    hourlyRate: 450,
    rating: 4.8,
    reviewCount: 127,
    lat: 12.9716,
    lng: 77.5946,
    city: "Bengaluru",
    skills: ["Complete Wiring", "MCB Installation", "Emergency Repair"],
    photo: "/images/service-electrician.jpg",
  },
  {
    id: "seed_provider_plumber_1",
    name: "Aman Singh",
    email: "aman.plumber@servigo.test",
    serviceCategory: "plumber",
    bio: "Plumbing specialist for leak fixes, bathroom fittings and drain issues.",
    yearsOfExperience: 7,
    hourlyRate: 420,
    rating: 4.7,
    reviewCount: 98,
    lat: 12.9352,
    lng: 77.6245,
    city: "Bengaluru",
    skills: ["Leak Repair", "Bathroom Fittings", "Drain Cleaning"],
    photo: "/images/service-plumber.jpg",
  },
  {
    id: "seed_provider_cleaner_1",
    name: "Priya Sharma",
    email: "priya.cleaner@servigo.test",
    serviceCategory: "cleaner",
    bio: "Professional deep-cleaning expert for homes and apartments.",
    yearsOfExperience: 6,
    hourlyRate: 350,
    rating: 4.6,
    reviewCount: 86,
    lat: 12.9062,
    lng: 77.5857,
    city: "Bengaluru",
    skills: ["Deep Cleaning", "Kitchen Cleaning", "Bathroom Sanitization"],
    photo: "/images/service-cleaning.jpg",
  },
  {
    id: "seed_provider_carpenter_1",
    name: "Vikram Reddy",
    email: "vikram.carpenter@servigo.test",
    serviceCategory: "carpenter",
    bio: "Carpenter for furniture assembly, repairs and custom woodwork.",
    yearsOfExperience: 9,
    hourlyRate: 500,
    rating: 4.9,
    reviewCount: 112,
    lat: 12.9961,
    lng: 77.6004,
    city: "Bengaluru",
    skills: ["Furniture Repair", "Custom Shelves", "Door Alignment"],
    photo: "/images/service-carpenter.jpg",
  },
  {
    id: "seed_provider_appliance_1",
    name: "Suresh Naidu",
    email: "suresh.appliance@servigo.test",
    serviceCategory: "appliance_repair",
    bio: "Appliance repair expert for AC, washing machine and refrigerators.",
    yearsOfExperience: 10,
    hourlyRate: 550,
    rating: 4.8,
    reviewCount: 140,
    lat: 12.9233,
    lng: 77.6451,
    city: "Bengaluru",
    skills: ["AC Service", "Washing Machine Repair", "Refrigerator Repair"],
    photo: "/images/service-electrician.jpg",
  },
];

const SEED_META_DOC = "providers_seed_v1";
const LOCAL_SEED_RADIUS_KM = 40;

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

function safeBucketPart(n: number): string {
  return n.toFixed(1).replace("-", "m").replace(".", "_");
}

export async function ensureSeedProviders(): Promise<void> {
  const anyVerified = await adminDb
    .collection("providers")
    .where("verificationStatus", "==", "verified")
    .limit(1)
    .get();
  if (!anyVerified.empty) return;

  const metaRef = adminDb.collection("_meta").doc(SEED_META_DOC);
  const metaSnap = await metaRef.get();
  if (metaSnap.exists && metaSnap.data()?.done === true) return;

  const batch = adminDb.batch();
  const now = FieldValue.serverTimestamp();

  for (const provider of SEED_PROVIDERS) {
    const userRef = adminDb.collection("users").doc(provider.id);
    const providerRef = adminDb.collection("providers").doc(provider.id);

    batch.set(
      userRef,
      {
        uid: provider.id,
        name: provider.name,
        email: provider.email,
        role: "provider",
        emailVerified: true,
        isBlocked: false,
        isProfileComplete: true,
        status: "active",
        createdAt: now,
        updatedAt: now,
        lastLogin: now,
      },
      { merge: true }
    );

    batch.set(
      providerRef,
      {
        uid: provider.id,
        serviceCategory: provider.serviceCategory,
        bio: provider.bio,
        yearsOfExperience: provider.yearsOfExperience,
        verificationStatus: "verified",
        verificationLevel: 1,
        verificationBadge: true,
        serviceAreaRadiusKm: 10,
        isAvailable: true,
        rating: provider.rating,
        reviewCount: provider.reviewCount,
        hourlyRate: provider.hourlyRate,
        completedJobs: provider.reviewCount + 40,
        skills: provider.skills,
        photo: provider.photo,
        location: {
          lat: provider.lat,
          lng: provider.lng,
          city: provider.city,
        },
        fraudFlags: {
          repeatedComplaints: false,
          highCancellationRate: false,
        },
        moderation: "none",
        documents: {
          idProofPath: "seed/id-proof",
          selfiePath: "seed/selfie",
        },
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );
  }

  batch.set(
    metaRef,
    {
      done: true,
      seededCount: SEED_PROVIDERS.length,
      seededAt: now,
    },
    { merge: true }
  );

  await batch.commit();
}

export async function ensureLocalSeedProviders(lat: number, lng: number): Promise<void> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

  const providersSnap = await adminDb
    .collection("providers")
    .where("verificationStatus", "==", "verified")
    .limit(300)
    .get();

  const hasNearby = providersSnap.docs.some((docSnap) => {
    const data = docSnap.data() ?? {};
    const pLat = Number(data.location?.lat);
    const pLng = Number(data.location?.lng);
    if (!Number.isFinite(pLat) || !Number.isFinite(pLng)) return false;
    return haversineKm(lat, lng, pLat, pLng) <= LOCAL_SEED_RADIUS_KM;
  });
  if (hasNearby) return;

  const latBucket = Math.round(lat * 10) / 10;
  const lngBucket = Math.round(lng * 10) / 10;
  const bucketKey = `${safeBucketPart(latBucket)}_${safeBucketPart(lngBucket)}`;
  const metaRef = adminDb.collection("_meta").doc(`providers_seed_local_${bucketKey}`);
  const metaSnap = await metaRef.get();
  if (metaSnap.exists && metaSnap.data()?.done === true) return;

  const offsets = [
    { lat: 0.01, lng: 0.0 },
    { lat: -0.01, lng: 0.008 },
    { lat: 0.012, lng: -0.006 },
    { lat: -0.009, lng: -0.01 },
    { lat: 0.004, lng: 0.012 },
  ];
  const templates = [
    {
      name: "Rohit Sharma",
      city: "Nearby Area",
      category: "electrician",
      rate: 450,
      skills: ["Wiring", "MCB", "Repair"],
      photo: "/images/service-electrician.jpg",
      bio: "Verified electrician handling home wiring, MCB and urgent electrical faults.",
    },
    {
      name: "Imran Khan",
      city: "Nearby Area",
      category: "plumber",
      rate: 420,
      skills: ["Leak Fix", "Pipes", "Drain"],
      photo: "/images/service-plumber.jpg",
      bio: "Experienced plumber for leak fixes, bathroom fittings and drainage work.",
    },
    {
      name: "Neha Verma",
      city: "Nearby Area",
      category: "cleaner",
      rate: 350,
      skills: ["Deep Clean", "Kitchen", "Bathroom"],
      photo: "/images/service-cleaning.jpg",
      bio: "Home cleaning professional focused on deep cleaning and hygiene standards.",
    },
    {
      name: "Manoj Yadav",
      city: "Nearby Area",
      category: "carpenter",
      rate: 500,
      skills: ["Furniture", "Woodwork", "Door Repair"],
      photo: "/images/service-carpenter.jpg",
      bio: "Skilled carpenter for furniture repair, shelves and precision woodwork.",
    },
    {
      name: "Arvind Rao",
      city: "Nearby Area",
      category: "appliance_repair",
      rate: 550,
      skills: ["AC", "Washing Machine", "Fridge"],
      photo: "/images/service-electrician.jpg",
      bio: "Appliance technician for AC, refrigerator and washing machine diagnostics.",
    },
  ] as const;

  const batch = adminDb.batch();
  const now = FieldValue.serverTimestamp();

  for (let i = 0; i < templates.length; i += 1) {
    const t = templates[i];
    const off = offsets[i];
    const id = `seed_local_${bucketKey}_${t.category}_${i + 1}`;
    const userRef = adminDb.collection("users").doc(id);
    const providerRef = adminDb.collection("providers").doc(id);

    batch.set(
      userRef,
      {
        uid: id,
        name: t.name,
        email: `${id}@servigo.test`,
        role: "provider",
        emailVerified: true,
        isBlocked: false,
        isProfileComplete: true,
        status: "active",
        createdAt: now,
        updatedAt: now,
        lastLogin: now,
      },
      { merge: true }
    );

    batch.set(
      providerRef,
      {
        uid: id,
        serviceCategory: t.category,
        bio: t.bio,
        yearsOfExperience: 4 + i,
        verificationStatus: "verified",
        verificationLevel: 1,
        verificationBadge: true,
        serviceAreaRadiusKm: 12,
        isAvailable: true,
        rating: 4.4 + i * 0.1,
        reviewCount: 30 + i * 7,
        hourlyRate: t.rate,
        completedJobs: 80 + i * 12,
        skills: [...t.skills],
        photo: t.photo,
        location: {
          lat: Number((latBucket + off.lat).toFixed(6)),
          lng: Number((lngBucket + off.lng).toFixed(6)),
          city: t.city,
        },
        fraudFlags: {
          repeatedComplaints: false,
          highCancellationRate: false,
        },
        moderation: "none",
        documents: {
          idProofPath: "seed/id-proof",
          selfiePath: "seed/selfie",
        },
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );
  }

  batch.set(
    metaRef,
    {
      done: true,
      seededCount: templates.length,
      seededAt: now,
      radiusKm: LOCAL_SEED_RADIUS_KM,
    },
    { merge: true }
  );

  await batch.commit();
}
