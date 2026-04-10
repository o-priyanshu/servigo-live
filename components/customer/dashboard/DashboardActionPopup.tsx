"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  isOpen: boolean;
  popupType: string;
  popupBookingId: string;
  onClose: () => void;
}

export default function DashboardActionPopup({ isOpen, popupType, popupBookingId, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/45 p-4">
      <div className={`w-full max-w-md rounded-2xl border bg-card p-5 shadow-2xl ${popupType === "booked" ? "border-emerald-200" : "border-red-200"}`}>
        <div className={`mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full ${popupType === "booked" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
          <Check size={28} />
        </div>
        <h3 className="text-center text-2xl font-bold text-foreground">
          {popupType === "booked" ? "Booking Confirmed!" : "Booking Cancelled"}
        </h3>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {popupType === "booked"
            ? "Your service appointment has been successfully scheduled."
            : "Your booking was cancelled successfully."}
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button className="h-10 rounded-lg px-4" onClick={onClose}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}