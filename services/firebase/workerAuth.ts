import {
  PhoneAuthProvider,
  RecaptchaVerifier,
  signInWithCredential,
  signInWithPhoneNumber,
  signOut,
  type UserCredential,
} from "firebase/auth";
import {
  doc,
  getDoc,
  getDocFromServer,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { uploadFileToCloudinary } from "@/lib/cloudinary-upload";
import { auth, db } from "@/lib/firebase";
import type {
  WorkerProfile,
  WorkerRegistrationData,
  WorkerVerificationStatus,
} from "@/services/firebase/types";

let recaptchaVerifier: RecaptchaVerifier | null = null;

function removeUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => removeUndefinedDeep(item)) as T;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, removeUndefinedDeep(v)]);
    return Object.fromEntries(entries) as T;
  }
  return value;
}

function getOrCreateRecaptcha(containerId: string): RecaptchaVerifier {
  if (typeof window === "undefined") {
    throw new Error("Phone OTP can only run in browser.");
  }

  if (recaptchaVerifier) return recaptchaVerifier;

  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
  });
  return recaptchaVerifier;
}

export const sendWorkerOTP = async (
  phone: string,
  recaptchaContainerId = "worker-phone-recaptcha"
) => {
  const verifier = getOrCreateRecaptcha(recaptchaContainerId);
  const confirmation = await signInWithPhoneNumber(auth, phone, verifier);
  return confirmation.verificationId;
};

export const verifyWorkerOTP = async (
  verificationId: string,
  otp: string,
  phone: string
): Promise<UserCredential> => {
  if (!verificationId || !otp) {
    throw new Error("Verification ID and OTP are required.");
  }

  const credential = PhoneAuthProvider.credential(verificationId, otp);
  const userCredential = await signInWithCredential(auth, credential);
  const tokenResult = await userCredential.user.getIdTokenResult(true);
  const tokenRole = String(tokenResult.claims.role ?? "");

  // Keep compatibility: current platform uses "provider", requested flow mentions "worker".
  if (tokenRole !== "provider" && tokenRole !== "worker") {
    await signOut(auth);
    throw new Error("This account is not authorized as a worker.");
  }

  // Optional sanity: prevent OTP from signing in mismatched phone account silently.
  if (phone && userCredential.user.phoneNumber && userCredential.user.phoneNumber !== phone) {
    await signOut(auth);
    throw new Error("Phone number mismatch.");
  }

  return userCredential;
};

export const registerWorker = async (
  data: WorkerRegistrationData
): Promise<{ uid: string; verificationStatus: WorkerVerificationStatus }> => {
  const uid = data.uid ?? auth.currentUser?.uid;
  if (!uid) throw new Error("User not authenticated.");

  const primarySkill = data.skills[0];
  const serviceCategory =
    primarySkill?.service === "electrician" ||
    primarySkill?.service === "plumber" ||
    primarySkill?.service === "cleaner" ||
    primarySkill?.service === "carpenter" ||
    primarySkill?.service === "appliance_repair"
      ? primarySkill.service
      : "electrician";

  const payload: Record<string, unknown> = {
    uid,
    name: data.name,
    phone: data.phone,
    email: data.email,
    gender: data.gender,
    dateOfBirth: data.dateOfBirth,
    address: data.address,
    serviceRadius: data.serviceRadius,
    serviceablePincodes: data.serviceablePincodes,
    skills: data.skills,
    languages: data.languages,
    tools: data.tools,
    bankDetails: data.bankDetails,
    verificationStatus: "pending",
    verificationData: {
      ...data.verificationData,
      submittedAt: serverTimestamp() as never,
    },
    trustScore: 0,
    trustTier: "T1",
    totalJobs: 0,
    totalEarnings: 0,
    rating: 0,
    ratingCount: 0,
    cancellationRate: 0,
    responseRate: 0,
    isAvailable: false,
    serviceCategory,
    yearsOfExperience: primarySkill?.experience ?? 0,
    location: {
      lat: data.address.lat,
      lng: data.address.lng,
      city: data.address.fullAddress || "Unknown",
      pincode: data.address.pincode,
    },
    documents: {
      idProofPath: data.verificationData.aadhaarFrontUrl,
      selfiePath: data.verificationData.selfieUrl,
      policeCertificatePath: data.verificationData.policeCertificateUrl || "",
    },
    moderation: "none",
    createdAt: serverTimestamp() as never,
    updatedAt: serverTimestamp() as never,
  };

  await setDoc(doc(db, "providers", uid), removeUndefinedDeep(payload), { merge: true });

  // Keep admin dashboards and customer/provider segmentation in sync.
  await setDoc(
    doc(db, "users", uid),
    removeUndefinedDeep({
      uid,
      role: "provider",
      name: data.name,
      phone: data.phone,
      email: data.email ?? "",
      isProfileComplete: true,
      status: "pending_verification",
      updatedAt: serverTimestamp(),
    }),
    { merge: true }
  );

  return { uid, verificationStatus: "pending" };
};

export const getWorkerProfile = async (uid: string): Promise<WorkerProfile | null> => {
  const ref = doc(db, "providers", uid);
  const snap = await getDocFromServer(ref).catch(() => getDoc(ref));
  if (!snap.exists()) return null;
  return { ...(snap.data() as WorkerProfile), uid };
};

export const checkWorkerVerificationStatus = async (
  uid: string
): Promise<WorkerVerificationStatus> => {
  const profile = await getWorkerProfile(uid);
  return profile?.verificationStatus ?? "pending";
};

export const updateWorkerProfile = async (
  uid: string,
  data: Partial<WorkerProfile>
): Promise<void> => {
  const payload = removeUndefinedDeep({
    ...data,
    updatedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "providers", uid), payload);
};

export const uploadWorkerDocument = async (
  uid: string,
  type: "aadhaar_front" | "aadhaar_back" | "selfie" | "profile_photo" | "certificate" | "other",
  file: File
): Promise<string> => {
  if (!uid) throw new Error("User id is required.");
  if (!(file instanceof File)) throw new Error("Valid document file is required.");

  return uploadFileToCloudinary(file, {
    folder: `users/${uid}/provider-documents`,
    publicIdPrefix: type,
  });
};
