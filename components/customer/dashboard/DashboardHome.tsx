"use client";

import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import CategoryFilter from "@/components/customer/providers/CategoryFilter";
import RadiusFilter from "@/components/customer/providers/RadiusFilter";
import  EmptyState  from "@/components/customer/shared/EmptyState";
import ProviderCard from "@/components/customer/providers/ProviderCard";
import  LocationGate  from "@/components/customer/location/LocationGate";
import MapPicker  from "@/components/customer/location/MapPicker";
import type { ServiceCategory } from "@/lib/types/index";
import type {
  CustomerBookingCardData,
  CustomerProvider,
  RadiusOption,
} from "@/components/customer/shared/types";

type ProviderSort = "recommended" | "nearest" | "rating" | "price";

function formatCategoryLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function formatAreaLabel(value: string) {
  const trimmed = value.trim();
  if (trimmed === "Permission Denied" || trimmed === "Location Unavailable") return "Choose Area";
  return trimmed || "Choose Area";
}

interface Props {
  providers: CustomerProvider[];
  providersLoading: boolean;
  providersError: string;
  selectedCategory: ServiceCategory | "All";
  setSelectedCategory: (c: ServiceCategory | "All") => void;
  selectedRadius: RadiusOption;
  setSelectedRadius: (r: RadiusOption) => void;
  sortBy: ProviderSort;
  setSortBy: (s: ProviderSort) => void;
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  onlineOnly: boolean;
  setOnlineOnly: (v: boolean) => void;
  femaleOnly: boolean;
  setFemaleOnly: (v: boolean) => void;
  rating45Plus: boolean;
  setRating45Plus: (v: boolean) => void;
  verifiedOnly: boolean;
  setVerifiedOnly: (v: boolean) => void;
  hasLocationAccess: boolean;
  locationLabel: string;
  userCoords: { lat: number; lng: number } | null;
  isValidatingLocation: boolean;
  locationValidationError: string;
  isSelectedPincodeServiceable: boolean | null;
  handleSelectLocation: () => void;
  applyLocationSelection: (label: string, coords: { lat: number; lng: number } | null) => Promise<{ serviceable: boolean; pincode: string }>;
  resolveLocationLabel: (lat: number, lng: number) => Promise<string>;
  isMapPickerOpen: boolean;
  setIsMapPickerOpen: (v: boolean) => void;
  recentBookings: CustomerBookingCardData[];
}

export default function DashboardHome({
  providers,
  providersLoading,
  providersError,
  selectedCategory,
  setSelectedCategory,
  selectedRadius,
  setSelectedRadius,
  sortBy,
  setSortBy,
  showFilters,
  setShowFilters,
  onlineOnly,
  setOnlineOnly,
  femaleOnly,
  setFemaleOnly,
  rating45Plus,
  setRating45Plus,
  verifiedOnly,
  setVerifiedOnly,
  hasLocationAccess,
  locationLabel,
  userCoords,
  isValidatingLocation,
  locationValidationError,
  isSelectedPincodeServiceable,
  handleSelectLocation,
  applyLocationSelection,
  resolveLocationLabel,
  isMapPickerOpen,
  setIsMapPickerOpen,
  recentBookings,
}: Props) {
  const areaLabel = formatAreaLabel(locationLabel);
  const [visibleCount, setVisibleCount] = useState(8);
  const visibleProviders = useMemo(() => {
    return providers.slice(0, visibleCount);
  }, [providers, visibleCount]);
  const hasMoreProviders = providers.length > visibleCount;

  useEffect(() => {
    setVisibleCount(8);
  }, [selectedCategory, selectedRadius, sortBy, onlineOnly, femaleOnly, rating45Plus, verifiedOnly, providers.length]);

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-4 sm:px-6 sm:py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">
          {selectedCategory === "All"
            ? `Services in ${areaLabel}`
            : `${formatCategoryLabel(selectedCategory)}s in ${areaLabel}`}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="h-10 rounded-xl px-4"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal size={15} className="mr-2" />
            {showFilters ? "Hide Filters" : "Filters"}
          </Button>
          <Button
            variant="outline"
            className="h-10 rounded-xl px-4"
            onClick={handleSelectLocation}
          >
            Use Current Location
          </Button>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as ProviderSort)}
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground outline-none"
          >
            <option value="recommended">Sort by: Recommended</option>
            <option value="nearest">Sort by: Nearest</option>
            <option value="rating">Sort by: Highest rating</option>
            <option value="price">Sort by: Lowest price</option>
          </select>
        </div>
      </div>

      {isMapPickerOpen && (
        <MapPicker
          isOpen={isMapPickerOpen}
          userCoords={userCoords}
          onConfirm={async (coords) => {
            const text = await resolveLocationLabel(coords.lat, coords.lng);
            await applyLocationSelection(text, coords);
            setIsMapPickerOpen(false);
          }}
          onClose={() => setIsMapPickerOpen(false)}
        />
      )}

      <LocationGate
        hasLocationAccess={hasLocationAccess}
        onRequestLocation={handleSelectLocation}
      >
        <div className="space-y-3 rounded-2xl border border-border/70 bg-card/85 p-4 shadow-sm">
          <CategoryFilter selected={selectedCategory} onChange={setSelectedCategory} />
          <RadiusFilter selected={selectedRadius} onChange={setSelectedRadius} />
          {showFilters && (
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={onlineOnly}
                  onChange={(e) => setOnlineOnly(e.target.checked)}
                />
                Online only
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={femaleOnly}
                  onChange={(e) => setFemaleOnly(e.target.checked)}
                />
                Female only
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={rating45Plus}
                  onChange={(e) => setRating45Plus(e.target.checked)}
                />
                Rating 4.5+
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                />
                Verified only
              </label>
            </div>
          )}

          {locationValidationError ? (
            <p className="text-xs text-red-600">{locationValidationError}</p>
          ) : null}
        </div>

        {recentBookings.length > 0 ? (
          <section className="space-y-2 rounded-2xl border border-border/70 bg-card/85 p-4 shadow-sm">
            <p className="text-sm font-semibold text-foreground">Recent bookings</p>
            <div className="grid gap-2 md:grid-cols-3">
              {recentBookings.slice(0, 3).map((booking) => (
                <div key={booking.id} className="rounded-xl border border-border/70 bg-background p-3">
                  <p className="truncate text-sm font-medium text-foreground">{booking.providerName}</p>
                  <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                    {booking.serviceCategory.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(booking.scheduledAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {providersLoading ? (
          <EmptyState
            title="Loading providers..."
            description="Fetching verified professionals near you."
          />
        ) : visibleProviders.length > 0 ? (
          <div className="space-y-3">
            <div className="grid gap-3 lg:grid-cols-2">
              {visibleProviders.map((provider, index) => (
                <ProviderCard key={provider.id} provider={provider} index={index} />
              ))}
            </div>
            {hasMoreProviders ? (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  className="h-10 rounded-xl px-5"
                  onClick={() => setVisibleCount((prev) => prev + 8)}
                >
                  Load More
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState
            title="No providers found"
            description={providersError || "Try changing filters, search, or radius."}
            className="md:min-h-[240px] md:flex md:flex-col md:items-center md:justify-center"
          />
        )}
      </LocationGate>
    </div>
  );
}
