"use client";

import { Calendar, Clock, MapPin, MessageCircle, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { BookingStatus } from "@/lib/types/index";
import type { CustomerBookingCardData } from "@/components/customer/shared/types";
import CancelBookingButton from "./CancelBookingButton";
import { getProviderProfileImage } from "@/lib/profile-image";

const statusColors: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-sky-100 text-sky-700",
  in_progress: "bg-violet-100 text-violet-700",
  awaiting_customer_confirmation: "bg-amber-100 text-amber-800",
  extension_requested: "bg-orange-100 text-orange-800",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

const statusLabels: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  awaiting_customer_confirmation: "Waiting for Approval",
  extension_requested: "Extension Requested",
  completed: "Completed",
  cancelled: "Cancelled",
};

interface BookingCardProps {
  booking: CustomerBookingCardData;
  index: number;
  canMessage?: boolean;
}

const BookingCard = ({ booking, index, canMessage = false }: BookingCardProps) => {
  const router = useRouter();
  const scheduled = new Date(booking.scheduledAt);
  const formattedDate = Number.isNaN(scheduled.getTime())
    ? booking.scheduledAt
    : scheduled.toLocaleDateString();
  const formattedTime = Number.isNaN(scheduled.getTime())
    ? "N/A"
    : scheduled.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const amount = booking.amount ?? 499;
  const duration = booking.durationHours ?? 1;
  const address = booking.address ?? "Home Service";
  const bookingHref = `/bookings/${booking.id}?from=${encodeURIComponent("/dashboard?tab=bookings")}`;
  const displayPhoto = getProviderProfileImage({
    providerId: booking.providerId ?? booking.id,
    providerName: booking.providerName,
    category: booking.serviceCategory,
    photo: booking.providerPhoto,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm"
    >
      <div className="flex gap-3">
        <Image
          src={displayPhoto}
          alt={booking.providerName}
          width={56}
          height={56}
          className="h-14 w-14 rounded-lg border border-border/70 object-cover"
          unoptimized
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">{booking.providerName}</h3>
              <p className="text-sm capitalize text-muted-foreground">{booking.serviceCategory}</p>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[booking.status]}`}>
              {statusLabels[booking.status]}
            </span>
          </div>
          <div className="mt-2 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-3">
            <span className="inline-flex items-center gap-1">
              <Calendar size={13} />
              {formattedDate}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock size={13} />
              {formattedTime}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={13} />
              {address}
            </span>
          </div>
          <div className="mt-3 rounded-xl border border-border/70 bg-muted/40 p-3">
            <div className="flex items-center justify-between text-sm">
              <p className="text-muted-foreground">Estimated duration</p>
              <p className="font-medium text-foreground">{duration} hour</p>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <p className="text-muted-foreground">Total amount</p>
              <p className="font-semibold text-foreground">Rs {amount}</p>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Button
              size="sm"
              className="h-9 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={!canMessage}
              onClick={() => {
                if (!canMessage) return;
                router.push(`/chat/${booking.id}`);
              }}
            >
              <MessageCircle size={13} className="mr-1.5" />
              {canMessage ? "Message" : "Messaging Locked"}
            </Button>
            {booking.status === "completed" ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 rounded-lg border-border text-sm"
                  onClick={() => router.push(`/reviews/${booking.id}`)}
                >
                  <Star size={13} className="mr-1.5" />
                  Write Review
                </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-9 rounded-lg border-border text-sm"
                onClick={() => router.push(bookingHref)}
              >
                View Details
              </Button>
            )}
          </div>
          <CancelBookingButton bookingId={booking.id} status={booking.status} scheduledAt={booking.scheduledAt} className="mt-2" />
        </div>
      </div>
    </motion.div>
  );
};

export default BookingCard;
