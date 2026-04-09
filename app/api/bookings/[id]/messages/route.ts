import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { requireSessionUser, AuthError } from "@/lib/server/session";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function isBookingParticipant(
  sessionUid: string,
  booking: Record<string, unknown>
): boolean {
  return booking.customerId === sessionUid || booking.providerId === sessionUid;
}

export async function GET(_: Request, context: RouteContext) {
  try {
    const sessionUser = await requireSessionUser();
    const { id } = await context.params;

    const bookingSnap = await adminDb.collection("bookings").doc(id).get();
    if (!bookingSnap.exists) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    const booking = bookingSnap.data() ?? {};
    if (!isBookingParticipant(sessionUser.uid, booking)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const messagesSnap = await adminDb
      .collection("bookings")
      .doc(id)
      .collection("messages")
      .orderBy("createdAt", "asc")
      .limit(200)
      .get();

    const messages = messagesSnap.docs.map((docSnap) => {
      const data = docSnap.data() ?? {};
      return {
        id: docSnap.id,
        senderId: data.senderId ?? "",
        senderRole: data.senderRole ?? "user",
        text: data.text ?? "",
        createdAt: data.createdAt ?? null,
      };
    });

    return NextResponse.json({ messages });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Booking Messages] GET failed:", error);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const sessionUser = await requireSessionUser();
    const { id } = await context.params;

    const bookingSnap = await adminDb.collection("bookings").doc(id).get();
    if (!bookingSnap.exists) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    const booking = bookingSnap.data() ?? {};
    if (!isBookingParticipant(sessionUser.uid, booking)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const text = String(body?.text ?? "").trim();
    if (!text) {
      return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
    }
    if (text.length > 2000) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }

    const msgRef = adminDb
      .collection("bookings")
      .doc(id)
      .collection("messages")
      .doc();

    await msgRef.set({
      senderId: sessionUser.uid,
      senderRole: sessionUser.role,
      text,
      createdAt: FieldValue.serverTimestamp(),
    });

    await adminDb.collection("bookings").doc(id).set(
      {
        updatedAt: FieldValue.serverTimestamp(),
        lastMessageAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ id: msgRef.id }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Booking Messages] POST failed:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
