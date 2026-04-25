import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CalendarCheck2, MapPin, PhoneCall, ShieldCheck } from "lucide-react";
import { adminDb } from "@/lib/firebase-admin";
import { requireSessionUser } from "@/lib/server/session";
import CancelBookingButton from "@/components/customer/booking/CancelBookingButton";
import type { ServiceCategory } from "@/lib/types/index";
import { normalizeProviderDisplayName } from "@/lib/server/provider-display";
import { getProviderProfileImage } from "@/lib/profile-image";
import CustomerPageNav from "@/components/customer/shared/CustomerPageNav";
import BookingLiveTracker from "@/components/customer/booking/BookingLiveTracker";
import BookingResolutionPanel from "@/components/customer/booking/BookingResolutionPanel";

interface BookingDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function BookingDetailPage({ params, searchParams }: BookingDetailPageProps) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const fromParam = typeof query.from === "string" ? query.from : "";
  const backHref =
    fromParam === "/dashboard?tab=home" ||
    fromParam === "/dashboard?tab=bookings" ||
    fromParam === "/bookings/history"
      ? fromParam
      : "/dashboard?tab=bookings";
  const sessionUser = await requireSessionUser();

  const bookingSnap = await adminDb.collection("bookings").doc(id).get();
  if (!bookingSnap.exists) notFound();

  const booking = bookingSnap.data() ?? {};
  const customerId = booking.customerId as string | undefined;
  const providerId = booking.providerId as string | undefined;

  if (sessionUser.role === "user" && customerId !== sessionUser.uid) {
    notFound();
  }
  if (sessionUser.role === "provider" && providerId !== sessionUser.uid) {
    notFound();
  }

  let providerName = "Provider";
  let providerPhoto = "";
  if (providerId) {
    const [userSnap, providerSnap] = await Promise.all([
      adminDb.collection("users").doc(providerId).get(),
      adminDb.collection("providers").doc(providerId).get(),
    ]);
    const providerData = providerSnap.exists ? providerSnap.data() ?? {} : {};
    if (userSnap.exists) {
      providerName = (userSnap.data()?.name as string) ?? providerName;
    }
    if (!providerName || providerName === "Provider") {
      providerName = String(providerData.name ?? providerName);
    }
    providerPhoto = String(
      providerData.photo ??
        providerData.verificationData?.profilePhotoUrl ??
        providerData.verificationData?.selfieUrl ??
        ""
    );
  }

  const scheduledAt = String(booking.scheduledAt ?? "");
  const amount = Number(booking.amount ?? 0);
  const status = String(booking.status ?? "pending");
  const address = String(booking.address ?? "Address not provided");
  const category = String(booking.serviceCategory ?? "service");
  const serviceDeadlineAt = String(booking.serviceDeadlineAt ?? "");
  const requestedExtensionMinutes = Number(booking.requestedExtensionMinutes ?? 0) || null;
  if (providerId) {
    providerName = normalizeProviderDisplayName(
      providerName,
      String(booking.serviceCategory ?? "electrician") as ServiceCategory,
      providerId
    );
  }
  const providerDisplayPhoto = getProviderProfileImage({
    providerId: providerId ?? "",
    providerName,
    category: category as ServiceCategory,
    photo: providerPhoto,
  });

  return (
    <main className="min-h-screen bg-background">
      <CustomerPageNav />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <div>
          <Link
            href={backHref}
            className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            Back
          </Link>
        </div>
        <section className="rounded-2xl border border-border bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Booking
          </p>
          <h1 className="mt-2 text-2xl font-bold text-foreground">Booking Details</h1>
          <p className="mt-1 text-sm text-muted-foreground">Booking ID: {id}</p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Service Provider</h2>
          <div className="mt-3 flex items-center gap-3">
            <Image
              src={providerDisplayPhoto}
              alt={providerName}
              width={52}
              height={52}
              className="h-12 w-12 rounded-xl border border-border/70 object-cover"
              unoptimized
            />
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="inline-flex items-center gap-2 text-foreground">
              <ShieldCheck size={14} className="text-emerald-600" />
              {providerName}
              </p>
              <p className="capitalize">{category}</p>
              <p>Status: <span className="font-medium text-foreground capitalize">{status.replace("_", " ")}</span></p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Appointment</h2>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            <p className="inline-flex items-center gap-2 text-foreground">
              <CalendarCheck2 size={14} className="text-emerald-600" />
              {new Date(scheduledAt).toLocaleString()}
            </p>
            <p className="inline-flex items-center gap-2 text-foreground">
              <MapPin size={14} className="text-emerald-600" />
              {address}
            </p>
            <p className="inline-flex items-center gap-2 text-foreground">
              <PhoneCall size={14} className="text-emerald-600" />
              Amount: Rs {amount}
            </p>
          </div>
          <CancelBookingButton bookingId={id} status={status} scheduledAt={scheduledAt} className="mt-4" />
          {status === "completed" ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-900">Job completed</p>
              <p className="mt-1 text-sm text-emerald-800">You can rate and review the worker now.</p>
              <div className="mt-3">
                <Link
                  href={`/reviews/${id}`}
                  className="inline-flex h-10 items-center rounded-md bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Write Review
                </Link>
              </div>
            </div>
          ) : null}
        </section>

        {providerId ? (
          <BookingLiveTracker
            bookingId={id}
            providerId={providerId}
            scheduledAt={scheduledAt}
            initialStatus={status}
          />
        ) : null}

        <BookingResolutionPanel
          bookingId={id}
          status={status}
          requestedExtensionMinutes={requestedExtensionMinutes}
          serviceDeadlineAt={serviceDeadlineAt || null}
        />
      </div>
    </main>
  );
}
