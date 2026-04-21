import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getProviderProfileImage } from "@/lib/profile-image";

interface RouteContext {
  params: Promise<{ providerId: string }>;
}

export async function GET(_: Request, context: RouteContext) {
  try {
    const { providerId } = await context.params;

    if (!providerId?.trim()) {
      return NextResponse.json({ error: "Provider id is required" }, { status: 400 });
    }

    const providerSnap = await adminDb.collection("providers").doc(providerId).get();
    if (!providerSnap.exists) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    const provider = providerSnap.data() ?? {};
    if (String(provider.verificationStatus ?? "") !== "verified") {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }
    const userSnap = await adminDb.collection("users").doc(providerId).get();
    const user = userSnap.data() ?? {};
    const verificationData = (provider.verificationData ?? {}) as {
      profilePhotoUrl?: string;
      selfieUrl?: string;
    };

    const category = String(provider.serviceCategory ?? "electrician");
    const name = String(user.name ?? "Provider");

    return NextResponse.json({
      id: providerId,
      name,
      photo: getProviderProfileImage({
        providerId,
        providerName: name,
        category,
        photo:
          String(provider.photo ?? "") ||
          String(verificationData.profilePhotoUrl ?? "") ||
          String(verificationData.selfieUrl ?? ""),
      }),
      serviceCategory: category,
      bio: provider.bio ?? "",
      yearsOfExperience: provider.yearsOfExperience ?? 0,
      serviceAreaRadiusKm: Number(provider.serviceRadius ?? provider.serviceAreaRadiusKm ?? 0),
      verificationStatus: provider.verificationStatus ?? "pending",
      isAvailable: provider.isAvailable === true,
      rating: provider.rating ?? 0,
      reviewCount: provider.reviewCount ?? 0,
      location: {
        city: String((provider.location ?? {}).city ?? ""),
      },
    });
  } catch (error: unknown) {
    console.error("[Provider API] GET failed:", error);
    return NextResponse.json({ error: "Failed to load provider" }, { status: 500 });
  }
}
