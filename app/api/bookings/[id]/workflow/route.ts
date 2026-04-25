import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { AuthError, requireSessionUser } from "@/lib/server/session";

type WorkflowAction =
  | "request_completion"
  | "request_extension"
  | "approve_completion"
  | "reject_completion"
  | "approve_extension"
  | "reject_extension";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const maybe = value as { toDate?: () => Date };
    if (typeof maybe.toDate === "function") return maybe.toDate().toISOString();
  }
  return null;
}

function parseExtraMinutes(raw: unknown): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 5 || value > 240) {
    throw new Error("Extension minutes must be an integer between 5 and 240.");
  }
  return value;
}

async function findWorkerJobRef(bookingId: string, workerId: string) {
  const byBookingId = await adminDb
    .collection("workerJobs")
    .where("bookingId", "==", bookingId)
    .where("workerId", "==", workerId)
    .limit(1)
    .get();

  return byBookingId.empty ? null : byBookingId.docs[0].ref;
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const sessionUser = await requireSessionUser();
    const { id } = await params;
    const bookingId = String(id ?? "").trim();
    if (!bookingId) {
      return NextResponse.json({ error: "Invalid booking id" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const action = String((body as { action?: string })?.action ?? "") as WorkflowAction;
    const allowedActions: WorkflowAction[] = [
      "request_completion",
      "request_extension",
      "approve_completion",
      "reject_completion",
      "approve_extension",
      "reject_extension",
    ];

    if (!allowedActions.includes(action)) {
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }

    const bookingRef = adminDb.collection("bookings").doc(bookingId);

    await adminDb.runTransaction(async (tx) => {
      const bookingSnap = await tx.get(bookingRef);
      if (!bookingSnap.exists) {
        throw new Error("Booking not found");
      }

      const booking = bookingSnap.data() ?? {};
      const customerId = String(booking.customerId ?? "");
      const providerId = String(booking.providerId ?? "");
      const bookingStatus = String(booking.status ?? "pending");
      const workerJobId = String(booking.workerJobId ?? "");
      const workerJobRef =
        (workerJobId ? adminDb.collection("workerJobs").doc(workerJobId) : null) ??
        (await findWorkerJobRef(bookingId, providerId));

      const workerIsOwner = sessionUser.role === "provider" && sessionUser.uid === providerId;
      const customerIsOwner = sessionUser.role === "user" && sessionUser.uid === customerId;

      if (action === "request_completion") {
        if (!workerIsOwner) {
          throw new Error("You are not allowed to request completion for this booking.");
        }
        if (bookingStatus !== "in_progress" && bookingStatus !== "confirmed") {
          throw new Error("Completion can only be requested while work is in progress.");
        }
        if (!workerJobRef) {
          throw new Error("Worker job not found.");
        }

        tx.update(bookingRef, {
          status: "awaiting_customer_confirmation",
          completionRequestedAt: FieldValue.serverTimestamp(),
          completionRequestedBy: providerId,
          updatedAt: FieldValue.serverTimestamp(),
        });

        tx.update(workerJobRef, {
          status: "completion_requested",
          completionRequestedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          statusHistory: FieldValue.arrayUnion({
            status: "completion_requested",
            at: new Date(),
          }),
        });
        return;
      }

      if (action === "request_extension") {
        if (!workerIsOwner) {
          throw new Error("You are not allowed to request an extension for this booking.");
        }
        if (bookingStatus !== "in_progress" && bookingStatus !== "confirmed") {
          throw new Error("Extensions can only be requested while work is active.");
        }
        if (!workerJobRef) {
          throw new Error("Worker job not found.");
        }

        const extraMinutes = parseExtraMinutes((body as { extraMinutes?: unknown })?.extraMinutes);

        tx.update(bookingRef, {
          status: "extension_requested",
          requestedExtensionMinutes: extraMinutes,
          extensionRequestedAt: FieldValue.serverTimestamp(),
          extensionRequestedBy: providerId,
          updatedAt: FieldValue.serverTimestamp(),
        });

        tx.update(workerJobRef, {
          status: "extension_requested",
          requestedExtensionMinutes: extraMinutes,
          extensionRequestedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          statusHistory: FieldValue.arrayUnion({
            status: "extension_requested",
            at: new Date(),
          }),
        });
        return;
      }

      if (action === "approve_completion") {
        if (!customerIsOwner) {
          throw new Error("You are not allowed to approve this booking.");
        }
        if (bookingStatus !== "awaiting_customer_confirmation") {
          throw new Error("This booking is not waiting for completion approval.");
        }
        if (!workerJobRef) {
          throw new Error("Worker job not found.");
        }

        const jobSnap = await tx.get(workerJobRef);
        const jobData = jobSnap.data() ?? {};
        const workerId = String(jobData.workerId ?? providerId ?? "");
        const price = (jobData.price ?? {}) as Record<string, unknown>;
        const amount = Number(price.base ?? booking.amount ?? 0);
        const commission = Number(price.commission ?? 0);
        const net = Number(price.net ?? 0);
        const existingEarningSnap = await adminDb
          .collection("workerEarnings")
          .where("jobId", "==", bookingId)
          .limit(1)
          .get();

        tx.update(bookingRef, {
          status: "completed",
          completedAt: FieldValue.serverTimestamp(),
          completionApprovedAt: FieldValue.serverTimestamp(),
          completionRequestedAt: null,
          completionRequestedBy: null,
          requestedExtensionMinutes: null,
          extensionRequestedAt: null,
          extensionRequestedBy: null,
          paymentStatus: "captured",
          payment: {
            ...(booking.payment ?? {}),
            status: "captured",
            capturedAt: FieldValue.serverTimestamp(),
          },
          updatedAt: FieldValue.serverTimestamp(),
        });

        tx.update(workerJobRef, {
          status: "completed",
          actualEndTime: FieldValue.serverTimestamp(),
          paymentStatus: "released",
          updatedAt: FieldValue.serverTimestamp(),
          statusHistory: FieldValue.arrayUnion({
            status: "completed",
            at: new Date(),
          }),
        });

        if (workerId && existingEarningSnap.empty) {
          tx.set(adminDb.collection("workerEarnings").doc(), {
            workerId,
            jobId: bookingId,
            amount,
            commission,
            net,
            status: "released",
            releasedAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
          });
        }
        return;
      }

      if (action === "reject_completion") {
        if (!customerIsOwner) {
          throw new Error("You are not allowed to reject this booking.");
        }
        if (bookingStatus !== "awaiting_customer_confirmation") {
          throw new Error("This booking is not waiting for completion approval.");
        }
        if (!workerJobRef) {
          throw new Error("Worker job not found.");
        }

        tx.update(bookingRef, {
          status: "in_progress",
          completionRequestedAt: null,
          completionRequestedBy: null,
          updatedAt: FieldValue.serverTimestamp(),
        });

        tx.update(workerJobRef, {
          status: "working",
          completionRequestedAt: null,
          updatedAt: FieldValue.serverTimestamp(),
          statusHistory: FieldValue.arrayUnion({
            status: "working",
            at: new Date(),
          }),
        });
        return;
      }

      if (action === "approve_extension") {
        if (!customerIsOwner) {
          throw new Error("You are not allowed to approve this extension.");
        }
        if (bookingStatus !== "extension_requested") {
          throw new Error("This booking is not waiting for extension approval.");
        }
        if (!workerJobRef) {
          throw new Error("Worker job not found.");
        }

        const extraMinutes = Number(booking.requestedExtensionMinutes ?? body?.requestedExtensionMinutes ?? 0);
        const currentDeadline = toIso(booking.serviceDeadlineAt)
          ? new Date(String(booking.serviceDeadlineAt))
          : new Date(String(booking.scheduledAt ?? Date.now()));
        const baseDeadline = Number.isFinite(currentDeadline.getTime())
          ? currentDeadline
          : new Date(Date.now());
        const nextDeadline = new Date(baseDeadline.getTime() + Math.max(0, extraMinutes) * 60 * 1000);

        tx.update(bookingRef, {
          status: "in_progress",
          serviceDeadlineAt: nextDeadline.toISOString(),
          extensionApprovedAt: FieldValue.serverTimestamp(),
          requestedExtensionMinutes: null,
          extensionRequestedAt: null,
          extensionRequestedBy: null,
          updatedAt: FieldValue.serverTimestamp(),
        });

        tx.update(workerJobRef, {
          status: "working",
          requestedExtensionMinutes: null,
          extensionRequestedAt: null,
          updatedAt: FieldValue.serverTimestamp(),
          statusHistory: FieldValue.arrayUnion({
            status: "working",
            at: new Date(),
          }),
        });
        return;
      }

      if (action === "reject_extension") {
        if (!customerIsOwner) {
          throw new Error("You are not allowed to reject this extension.");
        }
        if (bookingStatus !== "extension_requested") {
          throw new Error("This booking is not waiting for extension approval.");
        }
        if (!workerJobRef) {
          throw new Error("Worker job not found.");
        }

        tx.update(bookingRef, {
          status: "in_progress",
          requestedExtensionMinutes: null,
          extensionRequestedAt: null,
          extensionRequestedBy: null,
          updatedAt: FieldValue.serverTimestamp(),
        });

        tx.update(workerJobRef, {
          status: "working",
          requestedExtensionMinutes: null,
          extensionRequestedAt: null,
          updatedAt: FieldValue.serverTimestamp(),
          statusHistory: FieldValue.arrayUnion({
            status: "working",
            at: new Date(),
          }),
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Failed to update booking workflow";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
