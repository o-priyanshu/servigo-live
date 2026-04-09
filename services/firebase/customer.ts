import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { uploadFileToCloudinary } from "@/lib/cloudinary-upload";
import { db } from "@/lib/firebase";
import type { Address, Customer } from "@/services/firebase/types";
import { assertValidLatLng, normalizePincode, toIsoString } from "@/services/firebase/utils";

function toCustomer(uid: string, data: Record<string, unknown>): Customer {
  return {
    uid,
    name: String(data.name ?? ""),
    email: String(data.email ?? ""),
    phone: typeof data.phone === "string" ? data.phone : undefined,
    photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : undefined,
    referralCode: typeof data.referralCode === "string" ? data.referralCode : undefined,
    subscriptionPlan:
      data.subscriptionPlan === "basic" || data.subscriptionPlan === "family" || data.subscriptionPlan === "premium"
        ? data.subscriptionPlan
        : undefined,
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

function toAddress(id: string, data: Record<string, unknown>): Address {
  return {
    id,
    label: typeof data.label === "string" ? data.label : undefined,
    line1: String(data.line1 ?? ""),
    line2: typeof data.line2 === "string" ? data.line2 : undefined,
    city: String(data.city ?? ""),
    state: String(data.state ?? ""),
    pincode: String(data.pincode ?? ""),
    landmark: typeof data.landmark === "string" ? data.landmark : undefined,
    lat: Number(data.lat ?? 0),
    lng: Number(data.lng ?? 0),
    isDefault: data.isDefault === true,
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

async function clearDefaultAddress(uid: string): Promise<void> {
  const addressesRef = collection(db, "users", uid, "addresses");
  const defaultsSnap = await getDocs(query(addressesRef, where("isDefault", "==", true)));
  await Promise.all(defaultsSnap.docs.map((entry) => updateDoc(entry.ref, { isDefault: false, updatedAt: serverTimestamp() })));
}

export const getCustomerProfile = async (uid: string): Promise<Customer> => {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) {
    throw new Error("Customer profile not found.");
  }
  return toCustomer(uid, snap.data() as Record<string, unknown>);
};

export const updateCustomerProfile = async (uid: string, data: Partial<Customer>): Promise<void> => {
  const ref = doc(db, "users", uid);
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (typeof data.name === "string") payload.name = data.name.trim();
  if (typeof data.phone === "string") payload.phone = data.phone.trim();
  if (typeof data.photoUrl === "string") payload.photoUrl = data.photoUrl.trim();
  if (typeof data.referralCode === "string") payload.referralCode = data.referralCode.trim();
  if (data.subscriptionPlan === "basic" || data.subscriptionPlan === "family" || data.subscriptionPlan === "premium") {
    payload.subscriptionPlan = data.subscriptionPlan;
  }
  await setDoc(ref, payload, { merge: true });
};

export const getCustomerAddresses = async (uid: string): Promise<Address[]> => {
  const addressesRef = collection(db, "users", uid, "addresses");
  const snap = await getDocs(addressesRef);
  const rows = snap.docs.map((entry) => toAddress(entry.id, entry.data() as Record<string, unknown>));
  rows.sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    const ta = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
    const tb = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
    if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
    return tb - ta;
  });
  return rows;
};

export const addCustomerAddress = async (uid: string, address: Address): Promise<void> => {
  const pincode = normalizePincode(address.pincode);
  if (!pincode) {
    throw new Error("Address must include a valid 6-digit pincode.");
  }
  assertValidLatLng(address.lat, address.lng);
  if (!address.line1.trim() || !address.city.trim() || !address.state.trim()) {
    throw new Error("Address line, city, and state are required.");
  }

  if (address.isDefault) {
    await clearDefaultAddress(uid);
  }

  const addressesRef = collection(db, "users", uid, "addresses");
  const entryRef = address.id ? doc(addressesRef, address.id) : doc(addressesRef);
  await setDoc(
    entryRef,
    {
      label: address.label?.trim() || "Home",
      line1: address.line1.trim(),
      line2: address.line2?.trim() || "",
      city: address.city.trim(),
      state: address.state.trim(),
      pincode,
      landmark: address.landmark?.trim() || "",
      lat: address.lat,
      lng: address.lng,
      isDefault: address.isDefault === true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const updateCustomerAddress = async (
  uid: string,
  addressId: string,
  data: Partial<Address>
): Promise<void> => {
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (typeof data.label === "string") payload.label = data.label.trim();
  if (typeof data.line1 === "string") payload.line1 = data.line1.trim();
  if (typeof data.line2 === "string") payload.line2 = data.line2.trim();
  if (typeof data.city === "string") payload.city = data.city.trim();
  if (typeof data.state === "string") payload.state = data.state.trim();
  if (typeof data.landmark === "string") payload.landmark = data.landmark.trim();

  if (typeof data.pincode === "string") {
    const pincode = normalizePincode(data.pincode);
    if (!pincode) throw new Error("Address must include a valid 6-digit pincode.");
    payload.pincode = pincode;
  }

  const hasLat = typeof data.lat === "number";
  const hasLng = typeof data.lng === "number";
  if (hasLat || hasLng) {
    const lat = hasLat ? (data.lat as number) : NaN;
    const lng = hasLng ? (data.lng as number) : NaN;
    assertValidLatLng(lat, lng);
    payload.lat = lat;
    payload.lng = lng;
  }

  if (data.isDefault === true) {
    await clearDefaultAddress(uid);
    payload.isDefault = true;
  } else if (data.isDefault === false) {
    payload.isDefault = false;
  }

  await updateDoc(doc(db, "users", uid, "addresses", addressId), payload);
};

export const deleteCustomerAddress = async (uid: string, addressId: string): Promise<void> => {
  await deleteDoc(doc(db, "users", uid, "addresses", addressId));
};

export const uploadCustomerProfilePhoto = async (uid: string, file: File): Promise<string> => {
  if (!uid) throw new Error("Customer id is required.");
  if (!(file instanceof File)) throw new Error("Valid photo file is required.");
  return uploadFileToCloudinary(file, {
    folder: `users/${uid}`,
    publicIdPrefix: "profile-photo",
  });
};
