import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { AuthError, requireSessionUser } from "@/lib/server/session";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await requireSessionUser();
    const workerId = sessionUser.uid;
    const { id } = await params;
    const jobId = String(id ?? "").trim();
    if (!jobId) {
      return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
    }

    await adminDb.runTransaction(async (tx) => {
      let resolvedReqRef: FirebaseFirestore.DocumentReference | null = null;
      let resolvedReqData: Record<string, unknown> | null = null;

      const directReqRef = adminDb.collection("jobRequests").doc(jobId);
      const directReqSnap = await tx.get(directReqRef);
      if (directReqSnap.exists) {
        resolvedReqRef = directReqRef;
        resolvedReqData = directReqSnap.data() ?? {};
      } else {
        const linkedReqSnap = await tx.get(
          adminDb
            .collection("jobRequests")
            .where("bookingId", "==", jobId)
            .where("workerId", "==", workerId)
            .where("status", "==", "pending")
            .limit(1)
        );
        if (!linkedReqSnap.empty) {
          resolvedReqRef = linkedReqSnap.docs[0].ref;
          resolvedReqData = linkedReqSnap.docs[0].data() ?? {};
        }
      }

      if (resolvedReqRef && resolvedReqData) {
        if (String(resolvedReqData.workerId ?? "") !== workerId) {
          throw new Error("You are not allowed to accept this job.");
        }
        const requestStatus = String(resolvedReqData.status ?? "");
        if (requestStatus === "accepted") {
          return;
        }
        if (requestStatus !== "pending") {
          throw new Error("Job request is no longer pending.");
        }

        const bookingIdFromRequest = String(resolvedReqData.bookingId ?? "");
        let bookingRef = bookingIdFromRequest
          ? adminDb.collection("bookings").doc(bookingIdFromRequest)
          : null;
        let bookingSnap = bookingRef ? await tx.get(bookingRef) : null;
        if (!bookingSnap?.exists) {
          const linkedBookingSnap = await tx.get(
            adminDb
              .collection("bookings")
              .where("jobRequestId", "==", resolvedReqRef.id)
              .where("providerId", "==", workerId)
              .limit(1)
          );
          if (!linkedBookingSnap.empty) {
            bookingRef = linkedBookingSnap.docs[0].ref;
            bookingSnap = linkedBookingSnap.docs[0];
          }
        }
        if (!bookingRef || !bookingSnap?.exists) {
          throw new Error("Linked booking not found.");
        }
        const booking = bookingSnap.data() ?? {};
        if (String(booking.providerId ?? "") !== workerId) {
          throw new Error("You are not allowed to accept this job.");
        }
        const bookingStatus = String(booking.status ?? "");
        if (bookingStatus === "confirmed" || bookingStatus === "in_progress" || bookingStatus === "completed") {
          tx.update(resolvedReqRef, {
            status: "accepted",
            acceptedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
          return;
        }
        if (bookingStatus !== "pending") {
          throw new Error("Booking is no longer pending.");
        }

        const jobRef = adminDb.collection("workerJobs").doc();
        const base = Number(resolvedReqData.estimatedPrice ?? booking.amount ?? 0);
        const commission = Math.round(base * 0.1);
        const net = base - commission;

        tx.update(resolvedReqRef, {
          status: "accepted",
          acceptedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        tx.set(jobRef, {
          bookingId: bookingRef.id,
          workerId,
          customerId: resolvedReqData.customerId ?? booking.customerId ?? "",
          customerName: resolvedReqData.customerName ?? booking.customerName ?? "Customer",
          customerPhone: resolvedReqData.customerPhone ?? booking.customerPhone ?? "",
          customerAddress: resolvedReqData.customerAddress ?? {
            fullAddress: booking.address ?? "",
            pincode: "",
          },
          service: resolvedReqData.service ?? booking.serviceCategory ?? "",
          description: resolvedReqData.description ?? "",
          photos: Array.isArray(resolvedReqData.photos) ? resolvedReqData.photos : [],
          scheduledTime: resolvedReqData.scheduledTime ?? FieldValue.serverTimestamp(),
          status: "accepted",
          price: { base, commission, net },
          paymentStatus: "held",
          statusHistory: [{ status: "accepted", at: new Date() }],
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        tx.update(bookingRef, {
          status: "confirmed",
          workerId,
          workerJobId: jobRef.id,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return;
      }

      const bookingRef = adminDb.collection("bookings").doc(jobId);
      const bookingSnap = await tx.get(bookingRef);
      if (!bookingSnap.exists) throw new Error("Job request not found.");
      const booking = bookingSnap.data() ?? {};
      if (String(booking.providerId ?? "") !== workerId) {
        throw new Error("You are not allowed to accept this job.");
      }
      const bookingStatus = String(booking.status ?? "");
      if (bookingStatus === "confirmed" || bookingStatus === "in_progress" || bookingStatus === "completed") {
        return;
      }
      if (bookingStatus !== "pending") {
        throw new Error("Booking is no longer pending.");
      }

      const jobRef = adminDb.collection("workerJobs").doc();
      const base = Number(booking.amount ?? 0);
      const commission = Math.round(base * 0.1);
      const net = base - commission;
      const scheduledAtRaw = new Date(String(booking.scheduledAt ?? ""));

      tx.set(jobRef, {
        bookingId: bookingRef.id,
        workerId,
        customerId: booking.customerId ?? "",
        customerName: booking.customerName ?? "Customer",
        customerPhone: booking.customerPhone ?? "",
        customerAddress: {
          fullAddress: booking.address ?? "",
          pincode: "",
        },
        service: booking.serviceCategory ?? "",
        description: "",
        photos: Array.isArray(booking.jobPhotos) ? booking.jobPhotos : [],
        scheduledTime: Number.isFinite(scheduledAtRaw.getTime())
          ? scheduledAtRaw
          : FieldValue.serverTimestamp(),
        status: "accepted",
        price: { base, commission, net },
        paymentStatus: "held",
        statusHistory: [{ status: "accepted", at: new Date() }],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.update(bookingRef, {
        status: "confirmed",
        workerId,
        workerJobId: jobRef.id,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Failed to accept job";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
