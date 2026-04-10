import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  CalendarCheck2,
  Check,
  CircleHelp,
  Clock3,
  MapPin,
  MessageCircle,
  PhoneCall,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { adminDb } from "@/lib/firebase-admin";
import { requireSessionUser } from "@/lib/server/session";
import type { ServiceCategory } from "@/lib/types/index";
import { normalizeProviderDisplayName } from "@/lib/server/provider-display";
import CustomerPageNav from "@/components/customer/shared/CustomerPageNav";
import BookingPaymentSection from "@/components/customer/booking/BookingPaymentSection";

interface BookServicePageProps {
  params: Promise<{ id: string }>;
}

const timeline = [
  {
    step: 1,
    title: "Provider Confirmation",
    description: "Provider will confirm the appointment shortly. You will receive a notification.",
  },
  {
    step: 2,
    title: "Pre-Service Reminder",
    description: "You will get a reminder before the scheduled appointment window.",
  },
  {
    step: 3,
    title: "Service Completion",
    description: "After service, you can rate your experience and complete payment.",
  },
];

export default async function BookServicePage({ params }: BookServicePageProps) {
  const { id } = await params;
  const sessionUser = await requireSessionUser();

  const bookingSnap = await adminDb.collection("bookings").doc(id).get();
  if (!bookingSnap.exists) notFound();
  const booking = bookingSnap.data() ?? {};
  if (String(booking.customerId ?? "") !== sessionUser.uid) notFound();

  const providerId = String(booking.providerId ?? "");
  if (!providerId) notFound();

  const providerSnap = await adminDb.collection("providers").doc(providerId).get();
  const provider = providerSnap.data() ?? {};
  const providerUserSnap = await adminDb.collection("users").doc(providerId).get();
  const rawProviderName = String(providerUserSnap.data()?.name ?? "Provider");
  const category = String(booking.serviceCategory ?? "electrician") as ServiceCategory;
  const providerName = normalizeProviderDisplayName(rawProviderName, category, providerId);
  const rating = Number(provider.rating ?? 4.7);
  const reviewCount = Number(provider.reviewCount ?? 0);
  const years = Number(provider.yearsOfExperience ?? 5);

  const scheduledAt = new Date(String(booking.scheduledAt ?? ""));
  const scheduleDateLabel = Number.isNaN(scheduledAt.getTime())
    ? "Scheduled date unavailable"
    : scheduledAt.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  const scheduleTimeLabel = Number.isNaN(scheduledAt.getTime())
    ? "Time unavailable"
    : scheduledAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const address = String(booking.address ?? "Home Service");
  const serviceCharge = Math.max(0, Number(booking.amount ?? 0));

  // Get booking fee from services collection
  let bookingFee = 25; // Default ₹25
  try {
    const serviceSnap = await adminDb.collection("services").doc(String(booking.serviceCategory ?? "electrician")).get();
    if (serviceSnap.exists) {
      const serviceData = serviceSnap.data() ?? {};
      bookingFee = Number(serviceData.bookingFee ?? 25);
    }
  } catch (error) {
    console.log("Could not fetch booking fee, using default:", error);
  }

  return (
    <main className="min-h-screen bg-muted/40">
      <CustomerPageNav />

      <section className="bg-emerald-600 px-4 py-10 text-center text-white sm:py-12">
        <div className="mx-auto max-w-3xl">
          <span className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
            <Check size={28} />
          </span>
          <h1 className="text-4xl font-bold tracking-tight">Booking Confirmed!</h1>
          <p className="mt-2 text-sm text-emerald-100">Your service appointment has been successfully scheduled.</p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-2xl font-semibold text-foreground">Service Provider</h2>
          <div className="mt-4 flex gap-3">
            <div className="grid h-16 w-16 place-items-center rounded-lg bg-emerald-100 text-2xl font-bold text-emerald-700">
              {providerName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xl font-semibold text-foreground">{providerName}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {rating.toFixed(1)} ({reviewCount} reviews) - {years} years experience
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-md bg-muted px-2 py-1 capitalize">{String(category).replace("_", " ")}</span>
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-emerald-700">
                  <ShieldCheck size={12} />
                  Verified
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700">
              <PhoneCall size={15} />
              Call Provider
            </button>
            <Link
              href={`/chat/${id}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted/60"
            >
              <MessageCircle size={15} />
              Message
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-2xl font-semibold text-foreground">Appointment Details</h2>
          <div className="mt-4 space-y-4">
            <div className="flex gap-3">
              <CalendarCheck2 className="mt-0.5 text-emerald-600" size={18} />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Scheduled Date</p>
                <p className="text-base font-medium text-foreground">{scheduleDateLabel}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Clock3 className="mt-0.5 text-emerald-600" size={18} />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Scheduled Time</p>
                <p className="text-base font-medium text-foreground">{scheduleTimeLabel}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <MapPin className="mt-0.5 text-emerald-600" size={18} />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Service Location</p>
                <p className="text-base font-medium text-foreground">{address}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-2xl font-semibold text-foreground">Payment Required</h2>
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                  <Wallet className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-emerald-800">Booking Fee</p>
                  <p className="text-sm text-emerald-700">Required to confirm your appointment</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-emerald-800">₹{bookingFee}</p>
                <p className="text-sm text-emerald-600 mt-1">
                  Full service payment will be made directly to the provider after completion
                </p>
              </div>
            </div>

            <BookingPaymentSection bookingId={id} amount={bookingFee} />

            <p className="text-xs text-muted-foreground text-center">
              Secure payment powered by Razorpay
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-2xl font-semibold text-foreground">What Happens Next?</h2>
          <div className="mt-4 space-y-4">
            {timeline.map((item) => (
              <div key={item.step} className="flex gap-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
                  {item.step}
                </span>
                <div>
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="inline-flex items-center gap-2 text-base font-semibold text-amber-800">
            <AlertTriangle size={18} />
            Important Reminders
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-700">
            <li>Please be available at the scheduled time.</li>
            <li>Cancellation allowed up to 2 hours before appointment.</li>
            <li>Additional charges may apply for extra work or materials.</li>
            <li>Ensure clear access to the work area.</li>
          </ul>
        </section>

        <section className="grid gap-2 sm:grid-cols-2">
          <Link
            href="/dashboard?tab=bookings"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
          >
            View My Bookings
          </Link>
          <Link
            href="/dashboard?tab=home"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-muted/60"
          >
            Back to Home
          </Link>
        </section>

        <section className="border-t border-border pt-4 text-center text-sm text-muted-foreground">
          <p>Need help with your booking?</p>
          <p className="mt-1 inline-flex items-center gap-2">
            <CircleHelp size={14} />
            Contact Support - FAQs
          </p>
        </section>
      </div>
    </main>
  );
}
