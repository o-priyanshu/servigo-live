import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { requireSessionUser, AuthError } from "@/lib/server/session";

const CANCELLABLE_STATUSES = new Set(["pending", "confirmed"]);
const CANCELLATION_WINDOW_MS = 60 * 60 * 1000;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, { params }: RouteParams) {
  try {
    const sessionUser = await requireSessionUser();
    const { id } = await params;
    const bookingRef = adminDb.collection("bookings").doc(id);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = bookingSnap.data() ?? {};
    const customerId = String(booking.customerId ?? "");
    const providerId = String(booking.providerId ?? "");
    const isAllowed =
      sessionUser.role === "admin" ||
      (sessionUser.role === "user" && customerId === sessionUser.uid) ||
      (sessionUser.role === "provider" && providerId === sessionUser.uid);

    if (!isAllowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [customerSnap, providerUserSnap, providerProfileSnap] = await Promise.all([
      customerId ? adminDb.collection("users").doc(customerId).get() : Promise.resolve(null),
      providerId ? adminDb.collection("users").doc(providerId).get() : Promise.resolve(null),
      providerId ? adminDb.collection("providers").doc(providerId).get() : Promise.resolve(null),
    ]);

    const customerName = customerSnap?.exists
      ? String((customerSnap.data() ?? {}).name ?? "Customer")
      : String(booking.customerName ?? "Customer");
    const providerName = providerUserSnap?.exists
      ? String((providerUserSnap.data() ?? {}).name ?? "Provider")
      : String((providerProfileSnap?.data() ?? {}).name ?? "Provider");
    const providerPhoto = String((providerProfileSnap?.data() ?? {}).photo ?? "");

    return NextResponse.json({
      booking: {
        id,
        customerId,
        customerName,
        providerId,
        providerName,
        providerPhoto,
        serviceCategory: String(booking.serviceCategory ?? ""),
        status: String(booking.status ?? "pending"),
        scheduledAt: String(booking.scheduledAt ?? ""),
        address: String(booking.address ?? ""),
        amount: Number(booking.amount ?? 0),
        createdAt: booking.createdAt ?? null,
        updatedAt: booking.updatedAt ?? null,
        completedAt: booking.completedAt ?? null,
      },
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Bookings] GET failed:", error);
    return NextResponse.json({ error: "Failed to load booking" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const sessionUser = await requireSessionUser();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = String((body as { action?: string })?.action ?? "");

    if (action !== "cancel") {
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }

    const bookingRef = adminDb.collection("bookings").doc(id);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = bookingSnap.data() ?? {};
    const customerId = String(booking.customerId ?? "");
    const currentStatus = String(booking.status ?? "pending");
    const scheduledAt = new Date(String(booking.scheduledAt ?? ""));
    const amount = Number(booking.amount ?? 0);

    if (sessionUser.role !== "user" || customerId !== sessionUser.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!CANCELLABLE_STATUSES.has(currentStatus)) {
      return NextResponse.json({ error: "This booking can no longer be cancelled" }, { status: 409 });
    }

    if (Number.isFinite(scheduledAt.getTime()) && scheduledAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Past bookings cannot be cancelled" }, { status: 409 });
    }
    const msUntilScheduled = scheduledAt.getTime() - Date.now();
    const withinOneHour =
      Number.isFinite(msUntilScheduled) &&
      msUntilScheduled >= 0 &&
      msUntilScheduled <= CANCELLATION_WINDOW_MS;
    const cancellationCharge = withinOneHour ? Number((Math.max(0, amount) * 0.5).toFixed(2)) : 0;
    const isAccepted = currentStatus === "confirmed";
    const isPaid = String(booking.paymentStatus ?? String((booking.payment ?? {}).status ?? "")) === "paid";
    let refundMessage = "";

    await adminDb.runTransaction(async (tx) => {
      const freshBookingSnap = await tx.get(bookingRef);
      if (!freshBookingSnap.exists) {
        throw new Error("Booking not found");
      }

      const updatePayload: Record<string, unknown> = {
        status: "cancelled",
        cancelledBy: "customer",
        cancellationCharge,
        cancelledAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (!isAccepted && isPaid) {
        updatePayload.payment = {
          status: cancellationCharge > 0 ? "held" : "refunded",
          holdAmount: cancellationCharge > 0 ? cancellationCharge : Math.max(0, amount),
          refundedAt: cancellationCharge > 0 ? null : FieldValue.serverTimestamp(),
        };
        updatePayload.paymentStatus = cancellationCharge > 0 ? "held" : "refunded";
        refundMessage = "Refund Initiated";
      }

      if (isAccepted) {
        updatePayload.payment = {
          status: String((booking.payment ?? {}).status ?? "paid"),
          holdAmount: Number((booking.payment ?? {}).holdAmount ?? 0),
          refundedAt: null,
        };
        updatePayload.paymentStatus = String(booking.paymentStatus ?? "paid");

        const workerJobsSnap = await adminDb
          .collection("workerJobs")
          .where("bookingId", "==", id)
          .limit(1)
          .get();

        if (!workerJobsSnap.empty) {
          const jobSnap = workerJobsSnap.docs[0];
          const jobData = jobSnap.data() ?? {};
          const commission = Number(jobData.price?.commission ?? 0);
          const workerId = String(booking.providerId ?? "");

          if (workerId && commission > 0) {
            const workerRef = adminDb.collection("users").doc(workerId);
            const workerSnap = await tx.get(workerRef);
            if (workerSnap.exists) {
              const currentBalance = Number(workerSnap.data()?.walletBalance ?? 0);
              tx.update(workerRef, {
                walletBalance: currentBalance + commission,
                updatedAt: FieldValue.serverTimestamp(),
              });
            }
          }

          tx.update(jobSnap.ref, {
            status: "cancelled",
            paymentStatus: "released",
            cancelledBy: "customer",
            cancelledAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }

      tx.update(bookingRef, updatePayload);

      const jobRequestsSnap = await adminDb
        .collection("jobRequests")
        .where("bookingId", "==", id)
        .limit(20)
        .get();

      await Promise.all(
        jobRequestsSnap.docs.map(async (docSnap) => {
          const row = docSnap.data() ?? {};
          const status = String(row.status ?? "");
          if (status === "declined" || status === "expired" || status === "cancelled") return;
          await docSnap.ref.set(
            {
              status: "cancelled",
              cancelledBy: "customer",
              cancelledAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        })
      );
    });

    const responseBody: Record<string, unknown> = {
      ok: true,
      id,
      status: "cancelled",
      cancellationCharge,
    };
    if (refundMessage) {
      responseBody.message = refundMessage;
    }

    return NextResponse.json(responseBody);
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Bookings] PATCH failed:", error);
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}
