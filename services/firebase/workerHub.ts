import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface WorkerHub {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
}

export const getWorkerHub = async (
  workerId: string
): Promise<{ hubId: string | null; hub: WorkerHub | null }> => {
  const workerSnap = await getDoc(doc(db, "providers", workerId));
  if (!workerSnap.exists()) return { hubId: null, hub: null };

  const hubId = String(workerSnap.data().hubId ?? "");
  if (!hubId) return { hubId: null, hub: null };

  const hub = await getHubLocation(hubId);
  return { hubId, hub };
};

export const checkInAtHub = async (workerId: string, hubId: string): Promise<void> => {
  await addDoc(collection(db, "hubCheckins"), {
    workerId,
    hubId,
    checkedInAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "providers", workerId), {
    hubId,
    lastHubCheckInAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const getHubLocation = async (hubId: string): Promise<WorkerHub | null> => {
  const snap = await getDoc(doc(db, "hubs", hubId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    name: String(data.name ?? "Assigned Hub"),
    address: String(data.address ?? ""),
    lat: Number(data.lat ?? 0),
    lng: Number(data.lng ?? 0),
    phone: typeof data.phone === "string" ? data.phone : undefined,
  };
};

