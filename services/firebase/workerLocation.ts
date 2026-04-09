import { doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

let activeWatchId: number | null = null;

export const updateWorkerLocation = async (
  workerId: string,
  lat: number,
  lng: number
): Promise<void> => {
  await updateDoc(doc(db, "providers", workerId), {
    currentLocation: {
      lat,
      lng,
      lastUpdated: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  });
};

export const startLocationTracking = (
  workerId: string,
  callback: (location: { lat: number; lng: number; lastUpdated?: unknown }) => void
): (() => void) => {
  const unsubDoc = onSnapshot(doc(db, "providers", workerId), (snap) => {
    const data = snap.data() as { currentLocation?: { lat: number; lng: number; lastUpdated?: unknown } } | undefined;
    if (!data?.currentLocation) return;
    callback(data.currentLocation);
  });

  if (typeof window !== "undefined" && "geolocation" in navigator) {
    activeWatchId = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        callback({ lat, lng });
        try {
          await updateWorkerLocation(workerId, lat, lng);
        } catch (error) {
          console.error("[workerLocation] Failed to sync location:", error);
        }
      },
      (error) => {
        console.error("[workerLocation] Geolocation error:", error);
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 15_000 }
    );
  }

  return () => {
    unsubDoc();
    stopLocationTracking();
  };
};

export const stopLocationTracking = (): void => {
  if (activeWatchId !== null && typeof window !== "undefined" && "geolocation" in navigator) {
    navigator.geolocation.clearWatch(activeWatchId);
  }
  activeWatchId = null;
};

