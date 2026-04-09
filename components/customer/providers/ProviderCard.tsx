"use client";

import { useState } from "react";
import { MapPin, Briefcase, Heart, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import VerificationBadge from "./VerificationBadge";
import AvailabilityBadge from "./AvailabilityBadge";
import { Button } from "@/components/ui/button";
import type { CustomerProvider } from "@/components/customer/shared/types";
import { getProviderProfileImage } from "@/lib/profile-image";
import { useCustomerStore } from "@/store/customerStore";

interface ProviderCardProps {
  provider: CustomerProvider;
  index: number;
}

const ProviderCard = ({ provider, index }: ProviderCardProps) => {
  const router = useRouter();
  const selectedLocation = useCustomerStore((state) => state.selectedLocation);
  const addToFavorites = useCustomerStore((state) => state.addToFavorites);
  const removeFromFavorites = useCustomerStore((state) => state.removeFromFavorites);
  const [isFavoriteBusy, setIsFavoriteBusy] = useState(false);
  const providerId = String(provider.id ?? "").trim();
  const providerCategory = String(provider.category ?? "electrician");
  const startingRate = provider.hourlyRate ?? 350 + provider.experienceYears * 20;
  const topSkills = provider.skills?.slice(0, 3) ?? [];
  const returnToDashboard = encodeURIComponent("/dashboard?tab=home");
  const pincodeParam = selectedLocation?.pincode ? `&pincode=${encodeURIComponent(selectedLocation.pincode)}` : "";
  const providerHref = providerId
    ? `/provider/${providerId}?from=${returnToDashboard}${pincodeParam}`
    : "";
  const categoryLabel = providerCategory.replaceAll("_", " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
  const ratingLabel = Number.isFinite(provider.rating) ? provider.rating.toFixed(1) : "0.0";
  const hasDistance = Number.isFinite(provider.distanceKm) && provider.distanceKm >= 0;
  const distanceLabel = hasDistance
    ? provider.distanceKm > 0 && provider.distanceKm < 0.1
      ? "<0.1"
      : provider.distanceKm.toFixed(1)
    : null;
  const displayPhoto = getProviderProfileImage({
    providerId: provider.id,
    providerName: provider.name,
    category: provider.category,
    photo: provider.photo,
  });

  async function handleToggleFavorite() {
    if (isFavoriteBusy) return;
    setIsFavoriteBusy(true);
    try {
      if (provider.isFavorite) {
        await removeFromFavorites(provider.id);
      } else {
        await addToFavorites(provider.id);
      }
    } finally {
      setIsFavoriteBusy(false);
    }
  }

  function navigateToProfile() {
    if (!providerHref) return;
    router.push(providerHref);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group cursor-pointer rounded-2xl border border-border/80 bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      onClick={navigateToProfile}
    >
      <div className="flex gap-3">
        <Image
          src={displayPhoto}
          alt={provider.name}
          width={72}
          height={72}
          className="h-[72px] w-[72px] rounded-xl border border-border/70 object-cover"
          loading="lazy"
          unoptimized
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-foreground truncate">{provider.name}</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">{categoryLabel}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <AvailabilityBadge isOnline={provider.isOnline} status={provider.availabilityStatus} />
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleToggleFavorite();
                }}
                disabled={isFavoriteBusy}
                aria-label={provider.isFavorite ? "Remove favorite" : "Save provider"}
              >
                <Heart
                  size={14}
                  className={provider.isFavorite ? "fill-red-500 text-red-500" : ""}
                />
              </button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <Star size={14} className="fill-amber-400 text-amber-400" />
              {ratingLabel} <span className="text-muted-foreground">({provider.reviewCount})</span>
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Briefcase size={12} />
              {provider.experienceYears} yrs
            </span>
          </div>

          {topSkills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {topSkills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-3">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin size={12} />
                {distanceLabel ? `${distanceLabel} km away` : "Distance unavailable"}
              </span>
              {typeof provider.serviceRadiusKm === "number" && provider.serviceRadiusKm > 0 ? (
                <span className="text-xs text-muted-foreground">
                  Serves up to {provider.serviceRadiusKm} km
                </span>
              ) : null}
              {typeof provider.jobsInArea === "number" && provider.jobsInArea > 0 ? (
                <span className="text-xs text-muted-foreground">
                  {provider.jobsInArea} jobs in your area
                </span>
              ) : null}
              {provider.isVerified && <VerificationBadge />}
            </div>
            <p className="text-sm font-bold text-foreground">Rs {startingRate}/hr</p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              size="sm"
              className="h-9 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={(e) => {
                  e.stopPropagation();
                  navigateToProfile();
                }}
                disabled={!providerHref}
              >
              Book Now
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 rounded-lg border-border text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  navigateToProfile();
                }}
                disabled={!providerHref}
              >
                View Profile
              </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProviderCard;
