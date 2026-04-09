import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { asNumber, normalizePincode } from "@/services/firebase/utils";

function resolveLocationPayload(data: Record<string, unknown>): { lat: number; lng: number } | null {
  const current = data.currentLocation;
  if (current && typeof current === "object") {
    const currentObj = current as Record<string, unknown>;
    const lat = asNumber(currentObj.lat, NaN);
    const lng = asNumber(currentObj.lng, NaN);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  const location = data.location;
  if (location && typeof location === "object") {
    const locationObj = location as Record<string, unknown>;
    const lat = asNumber(locationObj.lat, NaN);
    const lng = asNumber(locationObj.lng, NaN);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  return null;
}

export const validatePincode = async (pincode: string): Promise<boolean> => {
  const normalized = normalizePincode(pincode);
  if (!normalized) return false;

  const byId = await getDoc(doc(db, "serviceablePincodes", normalized));
  if (byId.exists()) {
    const data = byId.data() as Record<string, unknown>;
    return data.isActive !== false;
  }

  const serviceableRef = collection(db, "serviceablePincodes");
  const altSnap = await getDocs(query(serviceableRef, where("pincode", "==", normalized), firestoreLimit(1)));
  if (altSnap.empty) return false;
  const row = altSnap.docs[0].data() as Record<string, unknown>;
  return row.isActive !== false;
};

export const getServiceablePincodes = async (): Promise<string[]> => {
  const snap = await getDocs(collection(db, "serviceablePincodes"));
  const rows = snap.docs
    .map((entry) => {
      const data = entry.data() as Record<string, unknown>;
      if (data.isActive === false) return null;
      const fromField = typeof data.pincode === "string" ? normalizePincode(data.pincode) : null;
      return fromField ?? normalizePincode(entry.id);
    })
    .filter((value): value is string => Boolean(value));

  rows.sort();
  return rows;
};

export const getWorkerLocation = (
  workerId: string,
  callback: (location: { lat: number; lng: number }) => void
): (() => void) => {
  const workerRef = doc(db, "providers", workerId);
  return onSnapshot(workerRef, (snap) => {
    if (!snap.exists()) return;
    const location = resolveLocationPayload(snap.data() as Record<string, unknown>);
    if (!location) return;
    callback(location);
  });
};
