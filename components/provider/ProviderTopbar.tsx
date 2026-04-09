"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, LogOut, MapPin, Search, ShieldCheck, UserCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { getWorkerProfile } from "@/services/firebase/workerAuth";
import { updateWorkerProfile } from "@/services/firebase/workerAuth";
import MapPicker from "@/components/customer/location/MapPicker";
import { useWorkerStore } from "@/store/workerStore";

export default function ProviderTopbar() {
  const router = useRouter();
  const { logout, firebaseUser } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showAreaEditor, setShowAreaEditor] = useState(false);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [savingArea, setSavingArea] = useState(false);
  const [areaError, setAreaError] = useState("");
  const worker = useWorkerStore((state) => state.worker);
  const setWorker = useWorkerStore((state) => state.setWorker);
  const fetchPendingJobs = useWorkerStore((state) => state.fetchPendingJobs);
  const [radiusKm, setRadiusKm] = useState(6);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!firebaseUser?.uid || worker?.uid === firebaseUser.uid) return;
    void (async () => {
      const profile = await getWorkerProfile(firebaseUser.uid);
      if (profile) setWorker(profile);
    })();
  }, [firebaseUser?.uid, setWorker, worker?.uid]);

  useEffect(() => {
    if (!worker) return;
    setRadiusKm(worker.serviceRadius ?? 6);
    if (typeof worker.address?.lat === "number" && typeof worker.address?.lng === "number") {
      setGeo({ lat: worker.address.lat, lng: worker.address.lng });
    } else {
      setGeo(null);
    }
  }, [worker]);

  async function resolveAreaFromCoords(lat: number, lng: number) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error("Could not resolve selected area.");
      }
      const data = (await response.json()) as {
        display_name?: string;
        address?: { postcode?: string };
      };
      const postcode = (data.address?.postcode ?? "").replace(/\D/g, "").slice(0, 6);
      return {
        area: data.display_name ?? `Selected area (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
        pincode: postcode,
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Failed to resolve area.");
    }
  }

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      router.replace("/auth/login");
    } catch (error) {
      console.error("[ProviderTopbar] Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
    }
  }

  async function handleSaveWorkArea(coords: { lat: number; lng: number }) {
    if (!worker?.uid) return;
    if (radiusKm < 1 || radiusKm > 100) {
      setAreaError("Radius must be between 1 and 100 km.");
      return;
    }
    setAreaError("");
    setSavingArea(true);
    try {
      const resolved = await resolveAreaFromCoords(coords.lat, coords.lng);
      const normalizedPincode = resolved.pincode.replace(/\D/g, "");
      if (!/^\d{6}$/.test(normalizedPincode)) {
        throw new Error("Could not detect a valid pincode for this point. Try nearby area.");
      }
      const nextAddress = {
        ...worker.address,
        fullAddress: resolved.area.trim() || worker.address?.fullAddress || "Service area",
        pincode: normalizedPincode,
        lat: coords.lat,
        lng: coords.lng,
      };
      const nextServiceablePincodes = Array.from(
        new Set([normalizedPincode, ...(worker.serviceablePincodes ?? [])])
      );

      await updateWorkerProfile(worker.uid, {
        address: nextAddress,
        location: {
          lat: nextAddress.lat,
          lng: nextAddress.lng,
          city: nextAddress.fullAddress || "Unknown",
          pincode: normalizedPincode,
        },
        serviceRadius: radiusKm,
        serviceablePincodes: nextServiceablePincodes,
      });

      setWorker({
        ...worker,
        address: nextAddress,
        serviceRadius: radiusKm,
        serviceablePincodes: nextServiceablePincodes,
        location: {
          ...worker.location,
          lat: nextAddress.lat,
          lng: nextAddress.lng,
          city: nextAddress.fullAddress || "Unknown",
          pincode: normalizedPincode,
        },
      });
      await fetchPendingJobs();
      setGeo(coords);
      setShowAreaEditor(false);
      setIsMapPickerOpen(false);
    } catch (error) {
      setAreaError(error instanceof Error ? error.message : "Failed to save work area.");
    } finally {
      setSavingArea(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <Link href="/provider/dashboard" className="flex items-center gap-2.5 lg:hidden">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-foreground text-background">
            <ShieldCheck size={17} />
          </span>
          <p className="text-xl font-bold tracking-tight">
            ServiGo<span className="text-emerald-500">.</span>
          </p>
        </Link>

        <div className="hidden min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 lg:flex">
          <Search size={15} className="text-muted-foreground" />
          <Input
            readOnly
            value={`Provider operations in ${worker?.address?.pincode ?? "your service area"}`}
            className="h-10 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowAreaEditor(true);
              setIsMapPickerOpen(true);
              setAreaError("");
            }}
            className="inline-flex h-10 items-center gap-1 rounded-lg border border-border bg-card px-3 text-sm hover:bg-muted"
            aria-label="Set work area"
          >
            <MapPin size={14} className="text-muted-foreground" />
            {worker?.address?.pincode ?? "N/A"}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Logout"
          >
            <LogOut size={16} />
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
          <Link
            href="/provider/notifications"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card"
            aria-label="Provider notifications"
          >
            <Bell size={18} />
          </Link>
          <Link
            href="/provider/profile"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card"
            aria-label="Provider profile"
          >
            <UserCircle2 size={18} />
          </Link>
        </div>
      </div>
      {showAreaEditor ? (
        <div className="border-t border-border/80 bg-card px-4 py-3 sm:px-6">
          {isMapPickerOpen ? (
            <div className="mb-3">
              <MapPicker
                isOpen={isMapPickerOpen}
                userCoords={geo ?? (worker ? { lat: worker.address.lat, lng: worker.address.lng } : null)}
                onConfirm={async (coords) => {
                  setAreaError("");
                  await handleSaveWorkArea(coords);
                }}
                onClose={() => {
                  setIsMapPickerOpen(false);
                  setShowAreaEditor(false);
                }}
              />
            </div>
          ) : null}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Radius</span>
            {[3, 5, 8, 12, 20].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRadiusKm(value)}
                className={`inline-flex h-8 items-center rounded-full border px-3 text-xs ${
                  radiusKm === value
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                {value} km
              </button>
            ))}
          </div>
          {areaError ? (
            <p className="mt-2 text-sm text-red-500">{areaError}</p>
          ) : null}
          {savingArea ? (
            <p className="mt-2 text-xs text-muted-foreground">Saving selected area...</p>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
