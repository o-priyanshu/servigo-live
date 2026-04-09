import "server-only";

import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import type {
  AccountStatus,
  Booking,
  BookingStatus,
  FraudFlag,
  Provider,
  ServiceCategory,
  User,
  VerificationStatus,
} from "@/lib/admin/types";

function toIso(value: unknown, fallback = new Date(0).toISOString()): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asCategory(value: unknown): ServiceCategory {
  const raw = asString(value, "electrician");
  if (
    raw === "electrician" ||
    raw === "plumber" ||
    raw === "cleaner" ||
    raw === "carpenter" ||
    raw === "appliance_repair"
  ) {
    return raw;
  }
  return "electrician";
}

function asVerificationStatus(value: unknown): VerificationStatus {
  const raw = asString(value, "pending");
  if (
    raw === "pending" ||
    raw === "verified" ||
    raw === "rejected" ||
    raw === "suspended"
  ) {
    return raw;
  }
  return "pending";
}

function asBookingStatus(value: unknown): BookingStatus {
  const raw = asString(value, "pending");
  if (
    raw === "pending" ||
    raw === "confirmed" ||
    raw === "in_progress" ||
    raw === "completed" ||
    raw === "cancelled" ||
    raw === "fraud_flagged"
  ) {
    return raw;
  }
  return "pending";
}

function mapFraudFlags(value: unknown): FraudFlag[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((flag, index) => {
      const data = (flag ?? {}) as Record<string, unknown>;
      const severityRaw = asString(data.severity, "low");
      const severity: FraudFlag["severity"] =
        severityRaw === "low" ||
        severityRaw === "medium" ||
        severityRaw === "high" ||
        severityRaw === "critical"
          ? severityRaw
          : "low";
      return {
        id: asString(data.id, `flag-${index + 1}`),
        reason: asString(data.reason, "Fraud signal detected"),
        severity,
        createdAt: toIso(data.createdAt, new Date().toISOString()),
        resolved: Boolean(data.resolved),
      };
    })
    .filter((flag) => flag.reason.length > 0);
}

async function getUserMap(userIds: string[]): Promise<Map<string, Record<string, unknown>>> {
  const uniq = Array.from(new Set(userIds.filter(Boolean)));
  if (uniq.length === 0) return new Map();
  const refs = uniq.map((id) => adminDb.collection("users").doc(id));
  const docs = await adminDb.getAll(...refs);
  const map = new Map<string, Record<string, unknown>>();
  docs.forEach((doc) => map.set(doc.id, (doc.data() ?? {}) as Record<string, unknown>));
  return map;
}

function mapAccountStatus(isBlocked: boolean): AccountStatus {
  return isBlocked ? "suspended" : "active";
}

export async function listAdminProvidersLive(): Promise<Provider[]> {
  const providersSnap = await adminDb.collection("providers").limit(300).get();
  const providerIds = providersSnap.docs.map((doc) => doc.id);
  const userMap = await getUserMap(providerIds);

  const activeBookingStatuses = new Set<BookingStatus>(["pending", "confirmed", "in_progress"]);
  const bookingsSnap = await adminDb.collection("bookings").limit(500).get();
  const activeCountByProvider = new Map<string, number>();
  for (const bookingDoc of bookingsSnap.docs) {
    const bookingData = bookingDoc.data() ?? {};
    const providerId = asString(bookingData.providerId);
    if (!providerId) continue;
    const status = asBookingStatus(bookingData.status);
    if (!activeBookingStatuses.has(status)) continue;
    activeCountByProvider.set(providerId, (activeCountByProvider.get(providerId) ?? 0) + 1);
  }

  const providers = providersSnap.docs.map((doc) => {
    const data = (doc.data() ?? {}) as Record<string, unknown>;
    const user = userMap.get(doc.id) ?? {};
    const documents = (data.documents ?? {}) as Record<string, unknown>;
    const verificationStatus = asVerificationStatus(data.verificationStatus);
    const rating = asNumber(data.rating, 0);
    const fraudFlags = mapFraudFlags(data.fraudFlags);
    const createdAt = toIso(data.createdAt, new Date().toISOString());

    return {
      id: doc.id,
      name: asString(user.name, "Provider"),
      email: asString(user.email, "no-email@servigo.in"),
      category: asCategory(data.serviceCategory),
      city: asString((data.location as Record<string, unknown> | undefined)?.city, "Unknown"),
      verificationStatus,
      rating,
      joinDate: createdAt,
      accountStatus: mapAccountStatus(Boolean(user.isBlocked)),
      earningsThisMonth: asNumber(data.earningsThisMonth, 0),
      activeBookings: activeCountByProvider.get(doc.id) ?? 0,
      aiVerificationResult:
        verificationStatus === "verified"
          ? "pass"
          : verificationStatus === "rejected" || verificationStatus === "suspended"
          ? "fail"
          : "manual_review",
      complaintHistoryCount: asNumber(data.complaintHistoryCount, 0),
      documents: {
        idDocumentUrl: asString(documents.idProofPath),
        selfieUrl: asString(documents.selfiePath),
        policeCertificateUrl: asOptionalString(documents.policeCertificatePath),
      },
      fraudFlags,
    } satisfies Provider;
  });

  providers.sort((a, b) => +new Date(b.joinDate) - +new Date(a.joinDate));
  return providers;
}

export async function getAdminProviderByIdLive(providerId: string): Promise<Provider | null> {
  const providers = await listAdminProvidersLive();
  return providers.find((provider) => provider.id === providerId) ?? null;
}

export async function listAdminUsersLive(): Promise<User[]> {
  const usersSnap = await adminDb.collection("users").limit(500).get();
  const bookingsSnap = await adminDb.collection("bookings").limit(1000).get();

  const bookingCountByUser = new Map<string, number>();
  for (const doc of bookingsSnap.docs) {
    const data = doc.data() ?? {};
    const customerId = asString(data.customerId);
    if (!customerId) continue;
    bookingCountByUser.set(customerId, (bookingCountByUser.get(customerId) ?? 0) + 1);
  }

  const users = usersSnap.docs
    .map((doc) => {
      const data = (doc.data() ?? {}) as Record<string, unknown>;
      const roleRaw = asString(data.role, "user");
      const role: User["role"] =
        roleRaw === "provider" || roleRaw === "admin" ? roleRaw : "user";
      return {
        id: doc.id,
        name: asString(data.name, "ServiGo User"),
        email: asString(data.email, "No email"),
        phone: asOptionalString(data.phone),
        role,
        totalBookings: bookingCountByUser.get(doc.id) ?? 0,
        reportsFiled: asNumber(data.reportsFiled, 0),
        accountStatus: mapAccountStatus(Boolean(data.isBlocked)),
        city: asString(data.city, "Unknown"),
        createdAt: toIso(data.createdAt, new Date().toISOString()),
      } satisfies User;
    });

  users.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  return users;
}

export async function listAdminBookingsLive(): Promise<Booking[]> {
  const bookingsSnap = await adminDb.collection("bookings").limit(500).get();
  const ids = new Set<string>();
  for (const doc of bookingsSnap.docs) {
    const data = doc.data() ?? {};
    const customerId = asString(data.customerId);
    const providerId = asString(data.providerId);
    if (customerId) ids.add(customerId);
    if (providerId) ids.add(providerId);
  }
  const userMap = await getUserMap(Array.from(ids));

  const bookings = bookingsSnap.docs.map((doc) => {
    const data = (doc.data() ?? {}) as Record<string, unknown>;
    const customerId = asString(data.customerId);
    const providerId = asString(data.providerId);
    const createdAt = toIso(data.createdAt, new Date().toISOString());
    const scheduledAt = toIso(data.scheduledAt, createdAt);
    const category = asCategory(data.serviceCategory);
    const status = asBookingStatus(data.status);
    const amount = asNumber(data.amount, 0);
    const city = asString((data.location as Record<string, unknown> | undefined)?.city, "Unknown");
    const fraudFlags = mapFraudFlags(data.fraudFlags);
    return {
      id: doc.id,
      customerId,
      customerName: asString(userMap.get(customerId)?.name, "Customer"),
      providerId,
      providerName: asString(userMap.get(providerId)?.name, "Provider"),
      service: category.replaceAll("_", " "),
      category,
      status,
      amount,
      city: city === "Unknown" ? asString(data.address, "Unknown") : city,
      createdAt,
      scheduledAt,
      commissionPercent: asNumber(data.commissionPercent, 15),
      cancellationHistory: Array.isArray(data.cancellationHistory)
        ? data.cancellationHistory.map((item) => String(item))
        : [],
      disputeNotes: Array.isArray(data.disputeNotes)
        ? data.disputeNotes.map((item) => String(item))
        : [],
      timeline: Array.isArray(data.timeline)
        ? data.timeline.map((item) => {
            const event = (item ?? {}) as Record<string, unknown>;
            return {
              at: toIso(event.at, createdAt),
              title: asString(event.title, "Event"),
              description: asString(event.description, ""),
            };
          })
        : [
            {
              at: createdAt,
              title: "Booking created",
              description: "Booking entered the system.",
            },
          ],
      chatPreview: [],
      fraudFlags,
    } satisfies Booking;
  });

  bookings.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  return bookings;
}
