import Image from "next/image";
import { notFound } from "next/navigation";
import {
  CircleCheck,
  MapPin,
  MessageCircle,
  Star,
  Wallet,
  Wrench,
} from "lucide-react";
import { adminDb } from "@/lib/firebase-admin";
import { getSessionUserFromHeaders } from "@/lib/server/session";
import type { ServiceCategory } from "@/lib/types/index";
import { normalizeProviderDisplayName } from "@/lib/server/provider-display";
import { getProviderProfileImage } from "@/lib/profile-image";
import CustomerPageNav from "@/components/customer/shared/CustomerPageNav";
import BackNavButton from "@/components/customer/shared/BackNavButton";
import ProviderReviewsPanel, {
  type ProviderReviewItem,
} from "@/components/customer/reviews/ProviderReviewsPanel";
import MaskedCallButton from "@/components/customer/providers/MaskedCallButton";
import RequestBookingForm from "@/components/customer/booking/RequestBookingForm";

interface ProviderProfilePageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const serviceCatalog: Record<string, { title: string; desc: string; price: number }[]> = {
  electrician: [
    { title: "Complete House Wiring", desc: "Full electrical wiring for homes.", price: 450 },
    { title: "MCB & Distribution Board Installation", desc: "Breaker and DB installation.", price: 400 },
    { title: "Emergency Electrical Repairs", desc: "Urgent fault and power issue fixes.", price: 550 },
    { title: "Lighting Installation", desc: "Lights, fans and fixture installation.", price: 350 },
  ],
  plumber: [
    { title: "Leak Detection & Repair", desc: "Pipe and tap leak repair.", price: 350 },
    { title: "Bathroom Fittings", desc: "Install and replace fittings.", price: 400 },
    { title: "Drain Cleaning", desc: "Kitchen and bathroom drain cleanup.", price: 300 },
    { title: "Emergency Plumbing", desc: "Urgent plumbing support.", price: 500 },
  ],
  cleaner: [
    { title: "Deep Home Cleaning", desc: "Comprehensive deep cleaning service.", price: 300 },
    { title: "Kitchen Sanitization", desc: "Detailed kitchen cleaning.", price: 250 },
    { title: "Bathroom Deep Clean", desc: "Scale and stain cleanup.", price: 250 },
    { title: "Move-in/Move-out Cleaning", desc: "End-to-end property cleaning.", price: 500 },
  ],
};

const weeklyAvailability = [
  ["Monday", "Available"],
  ["Tuesday", "Available"],
  ["Wednesday", "Limited"],
  ["Thursday", "Available"],
  ["Friday", "Available"],
  ["Saturday", "Booked"],
  ["Sunday", "Available"],
];

const workPortfolioPhotos = [
  "/images/worker-electrician.jpg",
  "/images/worker-plumber.jpg",
  "/images/worker-cleaning.jpg",
  "/images/worker-assembly.jpg",
  "/images/service-electrician.jpg",
  "/images/service-plumber.jpg",
];

function asIsoString(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const candidate = value as { toDate?: () => Date };
    if (typeof candidate.toDate === "function") {
      return candidate.toDate().toISOString();
    }
  }
  return null;
}

function normalizePincode(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 6) return null;
  return digits.slice(0, 6);
}

function inferTrustBadge(score: number): "Gold" | "Silver" | "Bronze" {
  if (score >= 85) return "Gold";
  if (score >= 70) return "Silver";
  return "Bronze";
}

function trustBadgeHelpText(badge: "Gold" | "Silver" | "Bronze"): string {
  if (badge === "Gold") {
    return "Gold: Verified profile, strong ratings, and consistent completed jobs.";
  }
  if (badge === "Silver") {
    return "Silver: Verified profile with good service quality and growing trust.";
  }
  return "Bronze: Basic trust level with ongoing profile and work history growth.";
}

export default async function ProviderProfilePage({
  params,
  searchParams,
}: ProviderProfilePageProps) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const bookingError = typeof query.bookingError === "string" ? query.bookingError : "";
  const fromParam = typeof query.from === "string" ? query.from : "";
  const customerAreaPincode = normalizePincode(
    typeof query.pincode === "string" ? query.pincode : ""
  );

  const providerSnap = await adminDb.collection("providers").doc(id).get();
  if (!providerSnap.exists) {
    notFound();
  }
  const provider = providerSnap.data() ?? {};
  if (String(provider.verificationStatus ?? "") !== "verified") {
    notFound();
  }
  const userSnap = await adminDb.collection("users").doc(id).get();
  const user = userSnap.exists ? userSnap.data() ?? {} : {};

  const category = (provider.serviceCategory as string) ?? "electrician";
  const verificationData = (provider.verificationData ?? {}) as {
    profilePhotoUrl?: string;
    selfieUrl?: string;
  };
  const profileName = normalizeProviderDisplayName(
    String((provider.name as string) || (user.name as string) || ""),
    category as ServiceCategory,
    id
  );
  const years = Number(provider.yearsOfExperience ?? 0);
  const rating = Number(provider.rating ?? 0);
  const reviewCount = Number(provider.reviewCount ?? 0);
  const jobsCompleted = Number(provider.completedJobs ?? provider.totalJobs ?? 0);
  const referenceCount = Number(provider.referenceCount ?? 0);
  const cleanHistory = provider.hasActiveViolations !== true;
  const onTimeRate = Math.max(0, Math.min(100, Number(provider.responseRate ?? 0)));
  const trustScore = Math.min(
    100,
    Math.max(
      35,
      (provider.verificationStatus === "verified" ? 40 : 10) +
        Math.min(30, jobsCompleted * 2) +
        (rating >= 4.5 ? 20 : 0) +
        (referenceCount > 0 ? 10 : 0)
    )
  );
  const trustBadge = inferTrustBadge(trustScore);
  const trustBadgeTooltip = trustBadgeHelpText(trustBadge);
  const rate = Math.max(200, Number(provider.hourlyRate ?? 450));
  const city = (provider.location?.city as string) ?? "Bengaluru";
  const services = serviceCatalog[category] ?? serviceCatalog.electrician;
  const heroImage = getProviderProfileImage({
    providerId: id,
    providerName: profileName,
    category,
    photo:
      String(provider.photo ?? "") ||
      String(verificationData.profilePhotoUrl ?? "") ||
      String(verificationData.selfieUrl ?? ""),
  });

  const sessionUser = await getSessionUserFromHeaders();
  let activeBookingId: string | null = null;
  if (sessionUser?.uid) {
    const bookingsSnap = await adminDb
      .collection("bookings")
      .where("customerId", "==", sessionUser.uid)
      .where("providerId", "==", id)
      .limit(20)
      .get();
    for (const docSnap of bookingsSnap.docs) {
      const status = docSnap.data().status as string;
      if (["confirmed", "in_progress", "completed"].includes(status)) {
        activeBookingId = docSnap.id;
        break;
      }
    }
  }

  const reviewDocs = await adminDb
    .collection("reviews")
    .where("providerId", "==", id)
    .limit(60)
    .get();

  const rawReviews = reviewDocs.docs.map((docSnap) => {
    const data = docSnap.data() ?? {};
    return {
      id: docSnap.id,
      bookingId: String(data.bookingId ?? ""),
      customerId: String(data.customerId ?? ""),
      rating: Number(data.rating ?? 0),
      comment: String(data.comment ?? ""),
      createdAtIso: asIsoString(data.createdAt),
    };
  });

  const customerIds = Array.from(new Set(rawReviews.map((item) => item.customerId).filter(Boolean)));
  const customerRefs = customerIds.map((uid) => adminDb.collection("users").doc(uid));
  const customerSnaps = customerRefs.length > 0 ? await adminDb.getAll(...customerRefs) : [];
  const customerNameById = new Map(
    customerSnaps
      .filter((snap) => snap.exists)
      .map((snap) => [snap.id, String((snap.data() ?? {}).name ?? "Customer")])
  );

  const bookingIds = Array.from(new Set(rawReviews.map((item) => item.bookingId).filter(Boolean)));
  const bookingRefs = bookingIds.map((bookingId) => adminDb.collection("bookings").doc(bookingId));
  const bookingSnaps = bookingRefs.length > 0 ? await adminDb.getAll(...bookingRefs) : [];
  const bookingCategoryById = new Map(
    bookingSnaps
      .filter((snap) => snap.exists)
      .map((snap) => [snap.id, String((snap.data() ?? {}).serviceCategory ?? "")])
  );

  const serviceLabelByCategory: Record<string, string> = {
    electrician: "Electrical Work",
    plumber: "Plumbing Service",
    cleaner: "Deep Cleaning",
    carpenter: "Carpentry",
    appliance_repair: "Appliance Repair",
  };

  const providerReviews: ProviderReviewItem[] = rawReviews
    .filter((review) => review.rating >= 1 && review.comment.length > 0)
    .map((review, index) => {
      const categoryValue = bookingCategoryById.get(review.bookingId) ?? "";
      return {
        id: review.id,
        customerName: customerNameById.get(review.customerId) ?? `Customer ${index + 1}`,
        customerId: review.customerId,
        rating: review.rating,
        comment: review.comment,
        createdAtIso: review.createdAtIso,
        serviceLabel: serviceLabelByCategory[categoryValue] ?? undefined,
      };
    })
    .slice(0, 5);

  const rawSkills = Array.isArray(provider.skills) ? provider.skills : [];
  const skillScores = rawSkills
    .map((entry) => {
      if (typeof entry === "string") {
        return { label: entry, score: 60 };
      }
      if (entry && typeof entry === "object") {
        const data = entry as Record<string, unknown>;
        const label = String(data.service ?? data.name ?? "Skill");
        const scoreRaw = Number(data.skillScore ?? data.score ?? 0);
        const score = Math.max(0, Math.min(100, Number.isFinite(scoreRaw) ? scoreRaw : 0));
        return { label, score };
      }
      return null;
    })
    .filter((item): item is { label: string; score: number } => item !== null)
    .slice(0, 6);

  let jobsInCustomerArea = 0;
  if (customerAreaPincode) {
    const jobsSnap = await adminDb
      .collection("bookings")
      .where("providerId", "==", id)
      .limit(300)
      .get();

    jobsInCustomerArea = jobsSnap.docs.filter((docSnap) => {
      const data = docSnap.data() ?? {};
      if (String(data.status ?? "") !== "completed") return false;
      const addr = String(data.address ?? "");
      const pincodeInAddress = normalizePincode(addr);
      return pincodeInAddress === customerAreaPincode;
    }).length;
  }

  return (
    <main className="min-h-screen bg-muted/40">
      <CustomerPageNav
        searchPlaceholder={`Search providers in ${city}`}
        locationLabel={city}
      />

      <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-6 lg:grid-cols-[1fr_320px] sm:px-6">
        <div className="lg:col-span-2">
          <BackNavButton
            from={fromParam}
            fallbackHref="/dashboard?tab=home"
            className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-card px-3 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
          />
        </div>
        <section className="space-y-4">
          <article className="rounded-2xl border border-border bg-card p-5">
            <div className="flex gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border/70">
                <Image
                  src={heroImage}
                  alt={`${profileName} profile`}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-4xl font-bold text-foreground">{profileName}</h1>
                <p className="text-base capitalize text-muted-foreground">{category}</p>
                <p className="mt-2 inline-flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Star size={14} className="fill-amber-400 text-amber-400" />
                    {rating.toFixed(1)} ({reviewCount} reviews)
                  </span>
                  <span>{years} years experience</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-md bg-emerald-100 px-2 py-1 text-emerald-700">Verified Professional</span>
                  <span
                    className="rounded-md bg-amber-100 px-2 py-1 text-amber-700"
                    title={trustBadgeTooltip}
                  >
                    {trustBadge} Trust
                  </span>
                  <span className="rounded-md bg-muted px-2 py-1">Background Checked</span>
                  <span className="rounded-md bg-muted px-2 py-1">Licensed</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  In {city} * Response around 15 minutes
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-3xl font-bold">{jobsCompleted}</p>
                <p className="text-xs text-muted-foreground">Jobs Done</p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-3xl font-bold">{onTimeRate}%</p>
                <p className="text-xs text-muted-foreground">On-time Rate</p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-3xl font-bold">{years}</p>
                <p className="text-xs text-muted-foreground">Years Exp</p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-3xl font-bold">Rs {rate}</p>
                <p className="text-xs text-muted-foreground">Per hour</p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-2xl font-semibold">Trust Score</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Verification</p>
                <p className="mt-1 text-sm font-semibold capitalize text-foreground">
                  {String(provider.verificationStatus ?? "pending")}
                </p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Jobs Completed</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{jobsCompleted}</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">References</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{referenceCount}</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Clean History</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {cleanHistory ? "Yes" : "Needs review"}
                </p>
              </div>
            </div>
          </article>

          {skillScores.length > 0 ? (
            <article className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-2xl font-semibold">Skill Scores</h2>
              <div className="mt-3 space-y-2">
                {skillScores.map((skill) => (
                  <div key={skill.label} className="rounded-xl border border-border p-3">
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <p className="font-medium text-foreground capitalize">
                        {skill.label.replaceAll("_", " ")}
                      </p>
                      <p className="text-muted-foreground">{skill.score}%</p>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${skill.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ) : null}

          {customerAreaPincode ? (
            <article className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-2xl font-semibold">Neighbor Proof</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {jobsInCustomerArea} completed job
                {jobsInCustomerArea === 1 ? "" : "s"} in your area ({customerAreaPincode}).
              </p>
            </article>
          ) : null}

          <article className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-2xl font-semibold">About</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {(provider.bio as string) ||
                "Experienced provider focused on safety, quality workmanship, and reliable service delivery."}
            </p>
          </article>

          <article className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-2xl font-semibold">Services Offered</h2>
            <div className="mt-3 space-y-2">
              {services.map((service) => (
                <div key={service.title} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{service.title}</p>
                    <p className="font-semibold">Rs {service.price}/hr</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{service.desc}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-2xl font-semibold">Work Portfolio</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {workPortfolioPhotos.map((src, i) => (
                <div
                  key={src}
                  className="relative h-28 overflow-hidden rounded-xl border border-border/60"
                >
                  <Image
                    src={src}
                    alt={`${profileName} work sample ${i + 1}`}
                    fill
                    sizes="(max-width: 640px) 50vw, 220px"
                    className="object-cover transition duration-300 hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </article>

          <ProviderReviewsPanel
            averageRating={rating}
            totalReviewCount={reviewCount}
            reviews={providerReviews}
          />
        </section>

        <aside className="space-y-4">
          <article className="rounded-2xl border border-border bg-card p-4">
            <p className="text-4xl font-bold">
              Rs {rate}
              <span className="text-base font-normal text-muted-foreground"> /hour</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Minimum 1 hour booking</p>

            <RequestBookingForm
              providerId={id}
              serviceCategory={category}
              city={city}
              services={services}
              bookingErrorInitial={bookingError}
              activeBookingId={activeBookingId}
            />

            <p className="mt-2 text-xs text-muted-foreground">Response time: Usually within 15 minutes</p>
          </article>

          <article className="rounded-2xl border border-border bg-card p-4">
            <h3 className="text-lg font-semibold">This Week&apos;s Availability</h3>
            <div className="mt-2 space-y-2 text-sm">
              {weeklyAvailability.map(([day, status]) => (
                <div key={day} className="flex items-center justify-between">
                  <p>{day}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      status === "Available"
                        ? "bg-emerald-100 text-emerald-700"
                        : status === "Limited"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-card p-4">
            <h3 className="text-lg font-semibold">Safety & Verification</h3>
            <div className="mt-2 space-y-2 text-sm text-muted-foreground">
              <p className="inline-flex items-center gap-2"><CircleCheck size={14} className="text-emerald-600" /> Identity Verified</p>
              <p className="inline-flex items-center gap-2"><CircleCheck size={14} className="text-emerald-600" /> Background Checked</p>
              <p className="inline-flex items-center gap-2"><CircleCheck size={14} className="text-emerald-600" /> Licensed Professional</p>
              <p className="inline-flex items-center gap-2"><CircleCheck size={14} className="text-emerald-600" /> Insurance Covered</p>
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-card p-4">
            <h3 className="text-lg font-semibold">Contact Information</h3>
            <div className="mt-2 space-y-2 text-sm text-muted-foreground">
              <MaskedCallButton className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1 text-sm hover:bg-muted/60" />
              <p className="inline-flex items-center gap-2"><MessageCircle size={14} /> Chat support available</p>
              <p className="inline-flex items-center gap-2"><MapPin size={14} /> Serves {city} & nearby</p>
              <p className="inline-flex items-center gap-2"><Wallet size={14} /> Member since 2020</p>
              <p className="inline-flex items-center gap-2"><Wrench size={14} /> Specialist in home service work</p>
            </div>
          </article>
        </aside>
      </div>
    </main>
  );
}
