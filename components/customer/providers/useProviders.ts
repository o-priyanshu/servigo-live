"use client";

import { useEffect, useMemo } from "react";
import { useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import type { ServiceCategory } from "@/lib/types/index";
import type { CustomerProvider, RadiusOption } from "@/components/customer/shared/types";
import { getProviderProfileImage } from "@/lib/profile-image";
import { db } from "@/lib/firebase";
import { useCustomerStore } from "@/store/customerStore";

interface UseProvidersProps {
  selectedCategory: ServiceCategory | "All";
  selectedRadius: RadiusOption;
  userCoords: { lat: number; lng: number } | null;
  searchQuery: string;
  onlineOnly: boolean;
  femaleOnly: boolean;
  rating45Plus: boolean;
  verifiedOnly: boolean;
  sortBy: string;
}

export function useProviders({
  selectedCategory,
  selectedRadius,
  userCoords,
  searchQuery,
  onlineOnly,
  femaleOnly,
  rating45Plus,
  verifiedOnly,
  sortBy,
}: UseProvidersProps) {
  const selectedLocation = useCustomerStore((state) => state.selectedLocation);
  const nearbyWorkers = useCustomerStore((state) => state.nearbyWorkers);
  const favorites = useCustomerStore((state) => state.favorites);
  const isLoadingWorkers = useCustomerStore((state) => state.isLoadingWorkers);
  const workersError = useCustomerStore((state) => state.workersError);
  const fetchNearbyWorkers = useCustomerStore((state) => state.fetchNearbyWorkers);
  const [availabilityByWorkerId, setAvailabilityByWorkerId] = useState<
    Record<string, "online" | "offline" | "busy">
  >({});

  const coords = userCoords ?? (selectedLocation ? { lat: selectedLocation.lat, lng: selectedLocation.lng } : null);
  const currentLat = coords?.lat;
  const currentLng = coords?.lng;
  const locationKey = selectedLocation
    ? `${selectedLocation.lat}:${selectedLocation.lng}:${selectedLocation.pincode}:${selectedLocation.address}`
    : "";

  useEffect(() => {
    if (typeof currentLat !== "number" || typeof currentLng !== "number") return;
    void fetchNearbyWorkers(
      currentLat,
      currentLng,
      selectedCategory === "All" ? undefined : selectedCategory,
      {
        radiusKm: selectedRadius,
        minRating: rating45Plus ? 4.5 : undefined,
        gender: femaleOnly ? "female" : "any",
        availableOnly: onlineOnly,
      }
    );
  }, [
    currentLat,
    currentLng,
    femaleOnly,
    fetchNearbyWorkers,
    locationKey,
    onlineOnly,
    rating45Plus,
    selectedCategory,
    selectedRadius,
  ]);

  useEffect(() => {
    if (typeof currentLat !== "number" || typeof currentLng !== "number") return;
    const interval = window.setInterval(() => {
      void fetchNearbyWorkers(
        currentLat,
        currentLng,
        selectedCategory === "All" ? undefined : selectedCategory,
        {
          radiusKm: selectedRadius,
          minRating: rating45Plus ? 4.5 : undefined,
          gender: femaleOnly ? "female" : "any",
          availableOnly: onlineOnly,
        }
      );
    }, 15000);
    return () => window.clearInterval(interval);
  }, [
    currentLat,
    currentLng,
    femaleOnly,
    fetchNearbyWorkers,
    locationKey,
    onlineOnly,
    rating45Plus,
    selectedCategory,
    selectedRadius,
  ]);

  useEffect(() => {
    if (nearbyWorkers.length === 0) return;

    const unsubscribers = nearbyWorkers.map((worker) =>
      onSnapshot(doc(db, "providers", worker.id), (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as Record<string, unknown>;
        const fallback = data.isAvailable === true ? "online" : "offline";
        const statusRaw = String(data.availabilityStatus ?? fallback).toLowerCase();
        const status: "online" | "offline" | "busy" =
          statusRaw === "busy" || statusRaw === "online" || statusRaw === "offline"
            ? statusRaw
            : fallback;
        setAvailabilityByWorkerId((prev) => {
          if (prev[worker.id] === status) return prev;
          return { ...prev, [worker.id]: status };
        });
      })
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [nearbyWorkers]);

  const providers = useMemo(() => {
    const favoriteIds = new Set(favorites.map((item) => item.id));
    const mapped: CustomerProvider[] = nearbyWorkers.map((worker) => ({
      availabilityStatus: availabilityByWorkerId[worker.id] ?? worker.availability,
      id: worker.id,
      name: worker.name,
      category: worker.serviceCategory,
      photo: getProviderProfileImage({
        providerId: worker.id,
        providerName: worker.name,
        category: worker.serviceCategory,
        photo: worker.photo,
      }),
      isOnline: (availabilityByWorkerId[worker.id] ?? worker.availability) === "online",
      isVerified: worker.isVerified,
      rating: Number(worker.rating ?? 0),
      reviewCount: Number(worker.reviewCount ?? 0),
      experienceYears: Number(worker.yearsOfExperience ?? 0),
      distanceKm: Number(worker.distanceKm ?? 0),
      serviceRadiusKm:
        typeof worker.serviceRadius === "number" ? Number(worker.serviceRadius) : undefined,
      hourlyRate: Number(worker.baseRate ?? 450),
      skills: Array.isArray(worker.skills)
        ? worker.skills
            .map((skill) => {
              if (typeof skill === "string") return skill;
              if (skill && typeof skill === "object") {
                return String((skill as { service?: unknown }).service ?? "");
              }
              return "";
            })
            .filter(Boolean)
        : [],
      jobsInArea: Number(worker.jobsInArea ?? worker.trust?.jobsInArea ?? 0),
      urgentEtaMinutes:
        typeof worker.urgentEtaMinutes === "number" ? worker.urgentEtaMinutes : null,
      isFavorite: favoriteIds.has(worker.id),
    }));

    const search = searchQuery.trim().toLowerCase();
    const filtered = mapped
      .filter((provider) => (selectedCategory === "All" ? true : provider.category === selectedCategory))
      .filter((provider) => provider.distanceKm <= selectedRadius)
      .filter((provider) => (onlineOnly ? provider.isOnline : true))
      .filter((provider) => (rating45Plus ? provider.rating >= 4.5 : true))
      .filter((provider) => (verifiedOnly ? provider.isVerified : true))
      .filter((provider) => {
        if (!search) return true;
        const hay = `${provider.name} ${provider.category} ${provider.skills?.join(" ") ?? ""}`.toLowerCase();
        return hay.includes(search);
      });

    filtered.sort((a, b) => {
      if (sortBy === "nearest") return a.distanceKm - b.distanceKm;
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "price") return (a.hourlyRate ?? 0) - (b.hourlyRate ?? 0);
      const scoreA = a.rating * 100 + a.reviewCount - a.distanceKm;
      const scoreB = b.rating * 100 + b.reviewCount - b.distanceKm;
      return scoreB - scoreA;
    });

    return filtered;
  }, [
    availabilityByWorkerId,
    favorites,
    nearbyWorkers,
    onlineOnly,
    rating45Plus,
    searchQuery,
    selectedCategory,
    selectedRadius,
    sortBy,
    verifiedOnly,
  ]);

  return { providers, loading: isLoadingWorkers, error: workersError };
}
