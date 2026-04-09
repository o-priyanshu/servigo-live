import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Signature missing" }, { status: 400 });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);
    const { event: eventType, payload } = event;

    if (eventType === "payment.captured") {
      const paymentEntity = payload.payment.entity;
      const orderId = paymentEntity.order_id;

      // Find payment record
      const paymentSnap = await adminDb
        .collection("payments")
        .where("orderId", "==", orderId)
        .limit(1)
        .get();

      if (paymentSnap.empty) {
        console.error("Payment record not found for order:", orderId);
        return NextResponse.json({ status: "ok" });
      }

      const paymentDoc = paymentSnap.docs[0];
      const paymentData = paymentDoc.data();

      // Update payment status
      await paymentDoc.ref.update({
        status: "completed",
        paymentId: paymentEntity.id,
        capturedAt: new Date(),
        updatedAt: new Date(),
      });

      // Update booking with payment info
      const bookingId = paymentData.bookingId;
      await adminDb.collection("bookings").doc(bookingId).update({
        paymentStatus: "completed",
        paymentId: paymentEntity.id,
        updatedAt: new Date(),
      });

      console.log("Payment captured successfully for booking:", bookingId);
    }

    return NextResponse.json({ status: "ok" });

  } catch (error: unknown) {
    console.error("[Payment Webhook] Error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}