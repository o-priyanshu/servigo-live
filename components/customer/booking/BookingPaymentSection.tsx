"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RazorpayPayment from "@/components/customer/booking/RazorpayPayment";

interface BookingPaymentSectionProps {
  bookingId: string;
  amount: number;
}

export default function BookingPaymentSection({ bookingId, amount }: BookingPaymentSectionProps) {
  const router = useRouter();
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const handleSuccess = () => {
    setPaymentError(null);
    router.push('/dashboard?tab=bookings');
  };

  const handleError = (error: string) => {
    setPaymentError(error);
  };

  return (
    <div className="space-y-3">
      <RazorpayPayment
        bookingId={bookingId}
        amount={amount}
        onSuccess={handleSuccess}
        onError={handleError}
      />
      {paymentError ? (
        <p className="text-sm text-red-600">Payment error: {paymentError}</p>
      ) : null}
    </div>
  );
}
