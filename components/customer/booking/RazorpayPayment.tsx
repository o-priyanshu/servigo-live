"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface RazorpayPaymentProps {
  bookingId: string;
  amount: number;
  onSuccess: () => void;
  onError: (error: string) => void;
}

interface RazorpayResponse {
  razorpay_payment_id: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  handler: (response: RazorpayResponse) => Promise<void>;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  theme: {
    color: string;
  };
  modal: {
    ondismiss: () => void;
  };
}

interface RazorpayInstance {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export default function RazorpayPayment({ bookingId, amount, onSuccess, onError }: RazorpayPaymentProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookingId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create payment order");
      }

      const { orderId, amount: orderAmount, currency, key } = await response.json();

      const options: RazorpayOptions = {
        key,
        amount: orderAmount * 100,
        currency,
        order_id: orderId,
        name: "ServiGo",
        description: "Booking Fee Payment",
        handler: async (paymentResponse) => {
          try {
            await updateDoc(doc(db, "bookings", bookingId), {
              paymentStatus: "paid",
              paymentId: paymentResponse.razorpay_payment_id,
              updatedAt: new Date(),
            });
            console.log("Payment status updated in Firestore");
            onSuccess();
          } catch (error) {
            console.error("Failed to update payment status:", error);
            onError("Payment verification failed");
          }
        },
        prefill: {
          name: "",
          email: "",
          contact: "",
        },
        theme: {
          color: "#059669",
        },
        modal: {
          ondismiss: function () {
            setIsLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Payment error:", error);
      onError(error instanceof Error ? error.message : "Payment failed");
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={isLoading}
      className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
      size="lg"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing Payment...
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-4 w-4" />
          Pay ₹{amount} Booking Fee
        </>
      )}
    </Button>
  );
}
