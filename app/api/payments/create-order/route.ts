import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { adminDb } from "@/lib/firebase-admin";
import { requireSessionUser } from "@/lib/server/session";

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireSessionUser();

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { bookingId } = body;
    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 });
    }

    // Verify booking exists and belongs to user
    const bookingSnap = await adminDb.collection("bookings").doc(bookingId).get();
    if (!bookingSnap.exists) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = bookingSnap.data() ?? {};
    if (String(booking.customerId ?? "") !== sessionUser.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if payment already exists
    const existingPaymentSnap = await adminDb
      .collection("payments")
      .where("bookingId", "==", bookingId)
      .where("status", "==", "completed")
      .limit(1)
      .get();

    if (!existingPaymentSnap.empty) {
      return NextResponse.json({ error: "Payment already completed" }, { status: 400 });
    }

    // Get service details to fetch booking fee
    const serviceCategory = String(booking.serviceCategory ?? "");
    const serviceSnap = await adminDb.collection("services").doc(serviceCategory).get();

    let bookingFee = 25; // Default ₹25
    if (serviceSnap.exists) {
      const serviceData = serviceSnap.data() ?? {};
      bookingFee = Number(serviceData.bookingFee ?? 25);
    }

    // Create Razorpay order
    const options = {
      amount: bookingFee * 100, // Amount in paisa
      currency: "INR",
      receipt: `booking_${bookingId}`,
      notes: {
        bookingId,
        customerId: sessionUser.uid,
        serviceCategory,
      },
    };

    const order = await razorpay.orders.create(options);

    // Store payment record in Firestore
    const paymentRef = adminDb.collection("payments").doc();
    await paymentRef.set({
      id: paymentRef.id,
      bookingId,
      customerId: sessionUser.uid,
      orderId: order.id,
      amount: bookingFee,
      currency: "INR",
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      orderId: order.id,
      amount: bookingFee,
      currency: "INR",
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });

  } catch (error: unknown) {
    console.error("[Payment Order] Error:", error);
    return NextResponse.json({ error: "Failed to create payment order" }, { status: 500 });
  }
}