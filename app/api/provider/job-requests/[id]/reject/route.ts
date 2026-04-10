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
      }

      if (resolvedReqRef && resolvedReqData) {
        if (String(resolvedReqData.workerId ?? "") !== workerId) {
          throw new Error("You are not allowed to decline this job.");
        }
        if (String(resolvedReqData.status ?? "") !== "pending") return;

        tx.update(resolvedReqRef, {
          status: "declined",
          declinedBy: workerId,
          declinedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        const bookingId = String(resolvedReqData.bookingId ?? "");
        if (bookingId) {
          tx.update(adminDb.collection("bookings").doc(bookingId), {
            status: "cancelled",
            cancelledBy: "provider",
            cancelledAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
        return;
      }

      const bookingRef = adminDb.collection("bookings").doc(jobId);
      const bookingSnap = await tx.get(bookingRef);
      if (!bookingSnap.exists) throw new Error("Job request not found.");
      const booking = bookingSnap.data() ?? {};
      if (String(booking.providerId ?? "") !== workerId) {
        throw new Error("You are not allowed to decline this job.");
      }
      if (String(booking.status ?? "") !== "pending") return;

      tx.update(bookingRef, {
        status: "cancelled",
        cancelledBy: "provider",
        cancelledAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Failed to reject job";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
