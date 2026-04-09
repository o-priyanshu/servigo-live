"use client";

import { useCallback, useEffect, useState } from "react";
import { useCustomerStore } from "@/store/customerStore";
import { validatePincode } from "@/services/firebase/location";
import { extractPincodeFromText, normalizePincode } from "@/services/firebase/utils";

type FallbackLocationState = {
  hasLocationAccess: boolean;
  locationLabel: string;
  userCoords: { lat: number; lng: number } | null;
};

function readStoredFallbackState(): FallbackLocationState {
  if (typeof window === "undefined") {
    return {
      hasLocationAccess: false,
      locationLabel: "Bengaluru",
      userCoords: null,
    };
  }

  const storedLocation = localStorage.getItem("servigo:selected-location");
  const storedAccess = localStorage.getItem("servigo:location-access");
  const storedCoords = localStorage.getItem("servigo:coords");

  let coords: { lat: number; lng: number } | null = null;
  if (storedCoords) {
    const [lat, lng] = storedCoords.split(",").map(Number);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      coords = { lat, lng };
    }
  }

  return {
    hasLocationAccess: storedAccess === "granted",
    locationLabel: storedLocation?.trim() || "Bengaluru",
    userCoords: coords,
  };
}

function persistFallbackState(next: FallbackLocationState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("servigo:selected-location", next.locationLabel);
  localStorage.setItem("servigo:location-access", next.hasLocationAccess ? "granted" : "denied");
  if (next.userCoords) {
    localStorage.setItem("servigo:coords", `${next.userCoords.lat},${next.userCoords.lng}`);
  } else {
    localStorage.removeItem("servigo:coords");
  }
}

export function useLocation() {
  const selectedLocation = useCustomerStore((state) => state.selectedLocation);
  const setSelectedLocation = useCustomerStore((state) => state.setSelectedLocation);
  const [fallbackState, setFallbackState] = useState<FallbackLocationState>(() => readStoredFallbackState());
  const [isValidatingLocation, setIsValidatingLocation] = useState(false);
  const [locationValidationError, setLocationValidationError] = useState("");
  const [isSelectedPincodeServiceable, setIsSelectedPincodeServiceable] = useState<boolean | null>(null);

  useEffect(() => {
    if (selectedLocation || !fallbackState.userCoords) return;
    const pincode = normalizePincode(extractPincodeFromText(fallbackState.locationLabel) ?? "") ?? "";
    setSelectedLocation({
      lat: fallbackState.userCoords.lat,
      lng: fallbackState.userCoords.lng,
      pincode,
      address: fallbackState.locationLabel,
    });
  }, [fallbackState.locationLabel, fallbackState.userCoords, selectedLocation, setSelectedLocation]);

  const hasLocationAccess = Boolean(selectedLocation) || fallbackState.hasLocationAccess;
  const locationLabel = selectedLocation?.address ?? fallbackState.locationLabel;
  const userCoords = selectedLocation
    ? { lat: selectedLocation.lat, lng: selectedLocation.lng }
    : fallbackState.userCoords;

  const applyLocationSelection = useCallback(
    async (
      label: string,
      coords: { lat: number; lng: number } | null,
      pincodeInput?: string
    ): Promise<{ serviceable: boolean; pincode: string }> => {
      const cleanLabel = label.trim();
      if (!cleanLabel) {
        setLocationValidationError("Please enter a valid location.");
        return { serviceable: false, pincode: "" };
      }

      const fallbackCoords = selectedLocation
        ? { lat: selectedLocation.lat, lng: selectedLocation.lng }
        : fallbackState.userCoords;
      const resolvedCoords = coords ?? fallbackCoords;

      const pincode =
        normalizePincode(
          pincodeInput ?? extractPincodeFromText(cleanLabel) ?? selectedLocation?.pincode ?? ""
        ) ?? "";

      setIsValidatingLocation(true);
      setLocationValidationError("");
      const serviceable = pincode ? await validatePincode(pincode).catch(() => false) : true;
      setIsSelectedPincodeServiceable(serviceable);
      const finalLabel = serviceable ? cleanLabel : `${cleanLabel} (Not serviceable yet)`;

      const nextFallback: FallbackLocationState = {
        hasLocationAccess: Boolean(resolvedCoords),
        locationLabel: finalLabel,
        userCoords: resolvedCoords,
      };
      setFallbackState(nextFallback);
      persistFallbackState(nextFallback);

      if (resolvedCoords) {
        setSelectedLocation({
          lat: resolvedCoords.lat,
          lng: resolvedCoords.lng,
          pincode,
          address: cleanLabel,
        });
      } else {
        setSelectedLocation(null);
      }
      setIsValidatingLocation(false);
      return { serviceable, pincode };
    },
    [fallbackState.userCoords, selectedLocation, setSelectedLocation]
  );

  const resolveCoordsByAddress = useCallback(
    async (query: string): Promise<{ lat: number; lng: number } | null> => {
      const q = query.trim();
      if (!q) return null;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`,
          { cache: "no-store" }
        );
        const data = (await res.json().catch(() => [])) as Array<{ lat?: string; lon?: string }>;
        const first = data[0];
        if (!first) return null;
        const lat = Number(first.lat ?? NaN);
        const lng = Number(first.lon ?? NaN);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { lat, lng };
      } catch {
        return null;
      }
    },
    []
  );

  const applyManualLocation = useCallback(
    async (addressInput: string): Promise<{ serviceable: boolean }> => {
      const address = addressInput.trim();
      const pincode = normalizePincode(extractPincodeFromText(address) ?? "") ?? "";
      if (!address) {
        setLocationValidationError("Please enter a valid address.");
        return { serviceable: false };
      }

      setIsValidatingLocation(true);
      setLocationValidationError("");
      const serviceable = pincode ? await validatePincode(pincode).catch(() => false) : true;
      setIsSelectedPincodeServiceable(serviceable);

      const queryText = `${address || "India"} ${pincode ? `- ${pincode}` : ""}`.trim();
      const coordsFromSearch = await resolveCoordsByAddress(queryText);
      const fallbackCoords = selectedLocation
        ? { lat: selectedLocation.lat, lng: selectedLocation.lng }
        : fallbackState.userCoords;
      const coords = coordsFromSearch ?? fallbackCoords ?? { lat: 12.9716, lng: 77.5946 };

      await applyLocationSelection(address || `Area ${pincode}`, coords, pincode);
      setIsValidatingLocation(false);
      return { serviceable };
    },
    [
      applyLocationSelection,
      fallbackState.userCoords,
      resolveCoordsByAddress,
      selectedLocation,
    ]
  );

  const resolveLocationMeta = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}`,
        { cache: "no-store" }
      );
      const data = await res.json().catch(() => ({}));
      const address = (data as { address?: Record<string, string> }).address ?? {};
      const primary = address.city ?? address.town ?? address.village ?? address.suburb ?? address.county;
      const secondary = address.state_district ?? address.state ?? address.country;
      const label = [primary, secondary].filter(Boolean).join(", ");
      const pincode = normalizePincode(address.postcode ?? "") ?? "";
      if (label) return { label, pincode };
      return { label: `Lat ${lat.toFixed(2)}, Lng ${lng.toFixed(2)}`, pincode };
    } catch {
      return { label: `Lat ${lat.toFixed(2)}, Lng ${lng.toFixed(2)}`, pincode: "" };
    }
  }, []);

  const resolveLocationLabel = useCallback(
    async (lat: number, lng: number) => {
      const meta = await resolveLocationMeta(lat, lng);
      return meta.label;
    },
    [resolveLocationMeta]
  );

  const handleSelectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      const nextFallback: FallbackLocationState = {
        hasLocationAccess: false,
        locationLabel: "Location Unavailable",
        userCoords: null,
      };
      setFallbackState(nextFallback);
      persistFallbackState(nextFallback);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        void (async () => {
          const meta = await resolveLocationMeta(lat, lng);
          await applyLocationSelection(meta.label, { lat, lng }, meta.pincode);
        })();
      },
      () => {
        const nextFallback: FallbackLocationState = {
          hasLocationAccess: false,
          locationLabel: "Permission Denied",
          userCoords: null,
        };
        setFallbackState(nextFallback);
        persistFallbackState(nextFallback);
        setSelectedLocation(null);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }
    );
  }, [applyLocationSelection, resolveLocationMeta, setSelectedLocation]);

  return {
    hasLocationAccess,
    locationLabel,
    userCoords,
    isValidatingLocation,
    locationValidationError,
    isSelectedPincodeServiceable,
    handleSelectLocation,
    applyLocationSelection,
    applyManualLocation,
    resolveLocationLabel,
  };
}
