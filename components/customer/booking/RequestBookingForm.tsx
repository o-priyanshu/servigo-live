"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCustomerStore } from "@/store/customerStore";
import { getCustomerAddresses } from "@/services/firebase/customer";
import { uploadBookingJobPhoto } from "@/services/firebase/booking";
import type { Address } from "@/services/firebase/types";
import type { ServiceCategory } from "@/lib/types/index";

interface ServiceItem {
  title: string;
  desc: string;
  price: number;
}

interface RequestBookingFormProps {
  providerId: string;
  serviceCategory: string;
  city: string;
  services: ServiceItem[];
  bookingErrorInitial?: string;
  activeBookingId?: string | null;
}

const SAFETY_SHIELD_PRICE = 15;

function areStringArraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function formatLocalDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatLocalTimeForInput(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export default function RequestBookingForm({
  providerId,
  serviceCategory,
  city,
  services,
  bookingErrorInitial = "",
  activeBookingId = null,
}: RequestBookingFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const {
    bookingInProgress,
    setBookingInProgress,
    clearBookingInProgress,
    createBooking,
    isLoadingBooking,
    bookingError,
  } = useCustomerStore();
  const safeServices = useMemo(
    () => (services.length > 0 ? services : [{ title: "General Service", desc: "", price: 0 }]),
    [services]
  );

  const [selectedService, setSelectedService] = useState(safeServices[0]?.title ?? "");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [estimatedHours, setEstimatedHours] = useState(2);
  const [serviceCity, setServiceCity] = useState(city);
  const [notes, setNotes] = useState("");
  const [safetyShield, setSafetyShield] = useState(false);
  const [jobPhotos, setJobPhotos] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [formError, setFormError] = useState(bookingErrorInitial);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const minPreferredDate = useMemo(() => formatLocalDateForInput(new Date()), []);
  const hasHydratedDraftRef = useRef(false);

  const selectedServicePrice = useMemo(() => {
    const match = safeServices.find((entry) => entry.title === selectedService);
    return Number(match?.price ?? safeServices[0]?.price ?? 0);
  }, [safeServices, selectedService]);

  const computedAmount = useMemo(() => {
    const hours = Math.min(12, Math.max(1, Number(estimatedHours) || 1));
    const base = selectedServicePrice * hours;
    return base + (safetyShield ? SAFETY_SHIELD_PRICE : 0);
  }, [estimatedHours, safetyShield, selectedServicePrice]);

  const selectedAddress = useMemo(
    () => addresses.find((addr) => addr.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId]
  );

  useEffect(() => {
    if (!bookingInProgress || hasHydratedDraftRef.current) return;
    hasHydratedDraftRef.current = true;
    if (bookingInProgress.scheduledAt) {
      const dt = new Date(bookingInProgress.scheduledAt);
      if (!Number.isNaN(dt.getTime())) {
        const nextDate = formatLocalDateForInput(dt);
        const nextTime = formatLocalTimeForInput(dt);
        if (dt.getTime() > Date.now()) {
          setPreferredDate(nextDate);
          setPreferredTime(nextTime);
        } else {
          setPreferredDate("");
          setPreferredTime("");
        }
      }
    }
    if (typeof bookingInProgress.amount === "number" && Number.isFinite(bookingInProgress.amount)) {
      const guessedHours = Math.max(1, Math.round(bookingInProgress.amount / Math.max(1, selectedServicePrice)));
      setEstimatedHours((prev) => {
        const next = Math.min(12, guessedHours);
        return prev === next ? prev : next;
      });
    }
    if (bookingInProgress.safetyShield === true) {
      setSafetyShield(true);
    }
    if (Array.isArray(bookingInProgress.jobPhotos)) {
      const nextPhotos = bookingInProgress.jobPhotos.filter(
        (item): item is string => typeof item === "string"
      );
      setJobPhotos((prev) => (areStringArraysEqual(prev, nextPhotos) ? prev : nextPhotos));
    }
  }, [bookingInProgress, selectedServicePrice]);

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    void (async () => {
      try {
        const rows = await getCustomerAddresses(user.uid);
        if (cancelled) return;
        setAddresses(rows);
        const defaultAddress = rows.find((row) => row.isDefault);
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
        }
      } catch {
        if (!cancelled) setAddresses([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  useEffect(() => {
    const scheduledDate =
      preferredDate && preferredTime ? new Date(`${preferredDate}T${preferredTime}:00`) : null;
    const scheduledAt =
      scheduledDate && !Number.isNaN(scheduledDate.getTime())
        ? scheduledDate.toISOString()
        : undefined;
    const addressValue = selectedAddress
      ? `${selectedAddress.line1}${selectedAddress.line2 ? `, ${selectedAddress.line2}` : ""}, ${selectedAddress.city}, ${selectedAddress.state} - ${selectedAddress.pincode}${notes ? ` (${notes})` : ""}`
      : `${serviceCity}${notes ? ` - ${notes}` : ""}`;

    const nextDraft = {
      providerId,
      serviceCategory: serviceCategory as ServiceCategory,
      scheduledAt,
      address: addressValue,
      amount: computedAmount,
      safetyShield,
      jobPhotos,
    };

    const isSameDraft =
      bookingInProgress?.providerId === nextDraft.providerId &&
      bookingInProgress?.serviceCategory === nextDraft.serviceCategory &&
      bookingInProgress?.scheduledAt === nextDraft.scheduledAt &&
      bookingInProgress?.address === nextDraft.address &&
      bookingInProgress?.amount === nextDraft.amount &&
      bookingInProgress?.safetyShield === nextDraft.safetyShield &&
      areStringArraysEqual(
        Array.isArray(bookingInProgress?.jobPhotos) ? bookingInProgress.jobPhotos : [],
        nextDraft.jobPhotos
      );

    if (!isSameDraft) {
      setBookingInProgress(nextDraft);
    }
  }, [
    bookingInProgress,
    computedAmount,
    jobPhotos,
    notes,
    preferredDate,
    preferredTime,
    providerId,
    safetyShield,
    selectedAddress,
    serviceCategory,
    serviceCity,
    setBookingInProgress,
  ]);

  async function handlePhotoUpload(files: FileList | null) {
    if (!files || files.length === 0 || !user?.uid) return;
    try {
      setIsUploadingPhoto(true);
      setFormError("");
      const picked = Array.from(files).slice(0, 4);
      const uploaded = await Promise.all(
        picked.map((file) => uploadBookingJobPhoto(user.uid, providerId, file))
      );
      setJobPhotos((prev) => [...prev, ...uploaded].slice(0, 6));
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : "Failed to upload photos.");
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  function validateSchedule(): string | null {
    if (!preferredDate || !preferredTime) {
      return "Please select a valid date and time.";
    }
    const scheduled = new Date(`${preferredDate}T${preferredTime}:00`);
    if (Number.isNaN(scheduled.getTime())) return "Please select a valid date and time.";
    if (scheduled.getTime() <= Date.now()) return "Scheduled date/time must be in the future.";
    return null;
  }

  async function handleCreateBooking() {
    setFormError("");
    if (!user?.uid) {
      setFormError("Please sign in to continue.");
      return;
    }

    const scheduleValidation = validateSchedule();
    if (scheduleValidation) {
      setFormError(scheduleValidation);
      return;
    }

    const safeHours = Number.isFinite(estimatedHours) ? Math.min(12, Math.max(1, estimatedHours)) : 1;
    const finalAddress = selectedAddress
      ? `${selectedAddress.line1}${selectedAddress.line2 ? `, ${selectedAddress.line2}` : ""}, ${selectedAddress.city}, ${selectedAddress.state} - ${selectedAddress.pincode}${notes ? ` (${notes})` : ""}`
      : `${serviceCity}${notes ? ` - ${notes}` : ""}`;
    if (!finalAddress.trim()) {
      setFormError("Service address is required.");
      return;
    }

    try {
      const scheduledAt = new Date(`${preferredDate}T${preferredTime}:00`).toISOString();
      const bookingId = await createBooking({
        customerId: user.uid,
        providerId,
        serviceCategory: serviceCategory as ServiceCategory,
        status: "pending",
        scheduledAt,
        address: finalAddress,
        amount: selectedServicePrice * safeHours + (safetyShield ? SAFETY_SHIELD_PRICE : 0),
        safetyShield,
        payment: {
          status: "held",
          holdAmount: selectedServicePrice * safeHours + (safetyShield ? SAFETY_SHIELD_PRICE : 0),
        },
        jobPhotos,
      });
      clearBookingInProgress();
      router.push(`/book/${bookingId}`);
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : "Unable to create booking.");
    }
  }

  return (
    <>
      {(formError || bookingError) ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {formError || bookingError}
        </p>
      ) : null}

      <div className="mt-3 space-y-2 text-sm">
        <label className="block">
          <span className="text-muted-foreground">Select Service</span>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3"
            required
          >
            {safeServices.map((service) => (
              <option key={service.title} value={service.title}>
                {service.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-muted-foreground">Preferred Date</span>
          <input
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
            type="date"
            min={minPreferredDate}
            className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3"
            required
          />
        </label>
        <label className="block">
          <span className="text-muted-foreground">Preferred Time</span>
          <input
            value={preferredTime}
            onChange={(e) => setPreferredTime(e.target.value)}
            type="time"
            className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3"
            required
          />
        </label>
        <label className="block">
          <span className="text-muted-foreground">Estimated Hours</span>
          <input
            value={estimatedHours}
            onChange={(e) => setEstimatedHours(Number(e.target.value))}
            type="number"
            min={1}
            max={12}
            className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3"
            required
          />
        </label>
        <label className="block">
          <span className="text-muted-foreground">Saved Address</span>
          <select
            value={selectedAddressId}
            onChange={(e) => setSelectedAddressId(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3"
          >
            <option value="">Use service city below</option>
            {addresses.map((address) => (
              <option key={address.id} value={address.id}>
                {(address.label || "Address")}: {address.line1}, {address.city} - {address.pincode}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-muted-foreground">Service City</span>
          <input
            value={serviceCity}
            onChange={(e) => setServiceCity(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3"
            required
          />
        </label>
        <label className="block">
          <span className="text-muted-foreground">Additional Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
            placeholder="Describe your requirements..."
          />
        </label>
        <label className="block">
          <span className="text-muted-foreground">Job Photos</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            onChange={(e) => void handlePhotoUpload(e.target.files)}
          />
        </label>
        {jobPhotos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {jobPhotos.map((photo) => (
              <div key={photo} className="relative overflow-hidden rounded-lg border border-border">
                <img src={photo} alt="Job upload" className="h-16 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setJobPhotos((prev) => prev.filter((item) => item !== photo))}
                  className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <label className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
          <span className="text-muted-foreground">Safety Shield (+Rs {SAFETY_SHIELD_PRICE})</span>
          <input
            type="checkbox"
            checked={safetyShield}
            onChange={(e) => setSafetyShield(e.target.checked)}
            title="Coverage for verified damage/dispute support during service."
            className="h-4 w-4 accent-emerald-600"
          />
        </label>
        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          Estimated total: Rs {computedAmount} (base + safety shield if enabled)
        </p>

        <button
          type="button"
          onClick={() => void handleCreateBooking()}
          disabled={isLoadingBooking || isUploadingPhoto}
          className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoadingBooking ? "Requesting..." : isUploadingPhoto ? "Uploading photos..." : "Request Booking"}
        </button>
      </div>

      {activeBookingId ? (
        <a
          href={`/chat/${activeBookingId}`}
          className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background text-sm font-medium hover:bg-muted/60"
        >
          <MessageCircle size={14} /> Send Message
        </a>
      ) : (
        <button
          disabled
          className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-muted text-sm font-medium text-muted-foreground"
        >
          <MessageCircle size={14} /> Send Message (after booking)
        </button>
      )}
    </>
  );
}
