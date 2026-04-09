"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import ProviderSectionHeader from "@/components/provider/ProviderSectionHeader";
import { useAuth } from "@/context/AuthContext";
import { registerWorker, uploadWorkerDocument } from "@/services/firebase/workerAuth";
import { useWorkerStore } from "@/store/workerStore";

type UploadState = {
  aadhaarFront?: File;
  aadhaarBack?: File;
  selfie?: File;
  policeCert?: File;
  profilePhoto?: File;
};

type UploadResultKey =
  | "aadhaarFrontUrl"
  | "aadhaarBackUrl"
  | "selfieUrl"
  | "policeCertificateUrl"
  | "profilePhotoUrl";

type UploadStorageType = Parameters<typeof uploadWorkerDocument>[1];

type UploadPlanStep = {
  key: UploadResultKey;
  storageType: UploadStorageType;
  label: string;
  file: File;
};

const MAX_UPLOAD_FILE_BYTES = 12 * 1024 * 1024;
const TARGET_IMAGE_BYTES = 1.5 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1600;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} is taking too long. Please try again.`)), ms);
    }),
  ]);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retry<T>(fn: () => Promise<T>, attempts: number, label: string): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        await wait(500 * (i + 1));
      }
    }
  }
  throw new Error(lastError instanceof Error ? lastError.message : `${label} failed.`);
}

async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image file."));
    };
    img.src = url;
  });
}

async function compressImageIfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.size <= TARGET_IMAGE_BYTES) return file;

  const image = await loadImageFromFile(file);
  const maxSide = Math.max(image.width, image.height);
  const ratio = maxSide > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / maxSide : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * ratio));
  canvas.height = Math.max(1, Math.round(image.height * ratio));
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  let quality = 0.85;
  let blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  while (blob && blob.size > TARGET_IMAGE_BYTES && quality > 0.5) {
    quality -= 0.1;
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  }

  if (!blob) return file;
  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}

export default function ProviderDocumentUploadPage() {
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const registrationData = useWorkerStore((state) => state.registrationData);
  const setRegistrationStep = useWorkerStore((state) => state.setRegistrationStep);
  const setRegistrationData = useWorkerStore((state) => state.setRegistrationData);

  const [files, setFiles] = useState<UploadState>({});
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState("");
  const [error, setError] = useState("");
  const [phoneInput, setPhoneInput] = useState(firebaseUser?.phoneNumber ?? "");
  const [aadhaarNumber, setAadhaarNumber] = useState(
    registrationData.verificationData?.aadhaarNumber ?? ""
  );
  const [referenceName, setReferenceName] = useState(
    registrationData.verificationData?.referenceName ?? ""
  );
  const [referencePhone, setReferencePhone] = useState(
    registrationData.verificationData?.referencePhone ?? ""
  );

  const canSubmit = useMemo(
    () => !!files.aadhaarFront && !!files.aadhaarBack && !!files.selfie,
    [files.aadhaarBack, files.aadhaarFront, files.selfie]
  );
  const normalizedPhone = phoneInput.replace(/\D/g, "");
  const normalizedAadhaar = aadhaarNumber.replace(/\D/g, "");
  const normalizedReferencePhone = referencePhone.replace(/\D/g, "");
  const accountNumber = registrationData.bankDetails?.accountNumber?.trim() ?? "";
  const ifscCode = registrationData.bankDetails?.ifscCode?.trim().toUpperCase() ?? "";

  useEffect(() => {
    if (registrationData.skills?.length) return;
    router.replace("/provider/register");
  }, [registrationData.skills?.length, router]);

  useEffect(() => {
    const nextReferenceName = referenceName.trim() || undefined;
    const nextReferencePhone = normalizedReferencePhone || undefined;
    const currentVerification = registrationData.verificationData;
    const phoneUnchanged = registrationData.phone === normalizedPhone;
    const aadhaarUnchanged = currentVerification?.aadhaarNumber === normalizedAadhaar;
    const referenceNameUnchanged = currentVerification?.referenceName === nextReferenceName;
    const referencePhoneUnchanged = currentVerification?.referencePhone === nextReferencePhone;

    if (phoneUnchanged && aadhaarUnchanged && referenceNameUnchanged && referencePhoneUnchanged) {
      return;
    }

    setRegistrationData({
      phone: normalizedPhone,
      verificationData: {
        ...(registrationData.verificationData ?? {
          aadhaarNumber: "",
          aadhaarFrontUrl: "",
          aadhaarBackUrl: "",
          selfieUrl: "",
        }),
        aadhaarNumber: normalizedAadhaar,
        referenceName: nextReferenceName,
        referencePhone: nextReferencePhone,
      },
    });
  }, [
    normalizedAadhaar,
    normalizedPhone,
    normalizedReferencePhone,
    referenceName,
    registrationData.phone,
    registrationData.verificationData,
    setRegistrationData,
  ]);

  useEffect(() => {
    if (!processing) return;
    const watchdog = setTimeout(() => {
      setProcessing(false);
      setProcessingStage("");
      setError("Upload timed out. Please retry with smaller image files or check your network.");
    }, 180000);

    return () => clearTimeout(watchdog);
  }, [processing]);

  async function submitForVerification() {
    if (!canSubmit || !firebaseUser?.uid) return;
    if (normalizedPhone.length < 10 || normalizedPhone.length > 15) {
      setError("Please enter a valid phone number before submitting.");
      return;
    }
    if (normalizedAadhaar.length !== 12) {
      setError("Please enter a valid 12-digit Aadhaar number.");
      return;
    }
    if ((referenceName.trim() && !normalizedReferencePhone) || (!referenceName.trim() && normalizedReferencePhone)) {
      setError("Please provide both reference name and reference phone, or leave both empty.");
      return;
    }
    if (normalizedReferencePhone && (normalizedReferencePhone.length < 10 || normalizedReferencePhone.length > 15)) {
      setError("Please enter a valid reference phone number.");
      return;
    }
    if (!/^\d{9,18}$/.test(accountNumber)) {
      setError("Please enter a valid bank account number.");
      return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
      setError("Please enter a valid IFSC code.");
      return;
    }
    const allSelected = Object.values(files).filter((value): value is File => Boolean(value));
    const oversized = allSelected.find((file) => file.size > MAX_UPLOAD_FILE_BYTES);
    if (oversized) {
      setError(`File "${oversized.name}" is too large. Please keep each file under 12MB.`);
      return;
    }

    setProcessing(true);
    setProcessingStage("Preparing verification request...");
    setProgress(0);
    setError("");

    try {
      for (let p = 0; p <= 30; p += 10) {
        setProgress(p);
        await new Promise((r) => setTimeout(r, 100));
      }

      const uploadPlan: UploadPlanStep[] = [
        { key: "aadhaarFrontUrl", storageType: "aadhaar_front", label: "Aadhaar front", file: files.aadhaarFront! },
        { key: "aadhaarBackUrl", storageType: "aadhaar_back", label: "Aadhaar back", file: files.aadhaarBack! },
        { key: "selfieUrl", storageType: "selfie", label: "Selfie", file: files.selfie! },
      ];
      if (files.policeCert) {
        uploadPlan.push({
          key: "policeCertificateUrl",
          storageType: "certificate",
          label: "Police certificate",
          file: files.policeCert,
        });
      }
      if (files.profilePhoto) {
        uploadPlan.push({
          key: "profilePhotoUrl",
          storageType: "profile_photo",
          label: "Profile photo",
          file: files.profilePhoto,
        });
      }

      const uploadResults: Partial<Record<UploadResultKey, string>> = {};
      for (let index = 0; index < uploadPlan.length; index += 1) {
        const step = uploadPlan[index];
        setProcessingStage(`Optimizing ${step.label}...`);
        const optimized = await withTimeout(compressImageIfNeeded(step.file), 15000, `${step.label} optimization`);
        setProcessingStage(`Uploading ${step.label} (${index + 1}/${uploadPlan.length})...`);
        const url = await withTimeout(
          retry(
            () => uploadWorkerDocument(firebaseUser.uid, step.storageType, optimized),
            3,
            `${step.label} upload`
          ),
          60000,
          `${step.label} upload`
        );
        uploadResults[step.key] = url;
        setProgress(30 + Math.round(((index + 1) / uploadPlan.length) * 55));
      }

      setProcessingStage("Saving provider profile...");
      await withTimeout(
        registerWorker({
          uid: firebaseUser.uid,
          name: firebaseUser.displayName ?? "Provider",
          phone: normalizedPhone,
          email: firebaseUser.email ?? "",
          gender: "other",
          address: registrationData.address ?? {
            fullAddress: "",
            lat: 0,
            lng: 0,
            pincode: "",
          },
          serviceRadius: registrationData.serviceRadius ?? 6,
          serviceablePincodes: registrationData.serviceablePincodes ?? [],
          skills: registrationData.skills ?? [],
          languages: registrationData.languages ?? [],
          tools: registrationData.tools ?? [],
          bankDetails: registrationData.bankDetails ?? {
            accountName: "",
            bankName: "",
            accountNumber,
            ifscCode,
          },
          verificationData: {
            aadhaarNumber: normalizedAadhaar,
            aadhaarFrontUrl: uploadResults.aadhaarFrontUrl ?? "",
            aadhaarBackUrl: uploadResults.aadhaarBackUrl ?? "",
            selfieUrl: uploadResults.selfieUrl ?? "",
            selfieCapturedDate: new Date().toISOString().slice(0, 10),
            policeCertificateUrl: uploadResults.policeCertificateUrl || undefined,
            profilePhotoUrl:
              uploadResults.profilePhotoUrl ||
              registrationData.verificationData?.profilePhotoUrl ||
              uploadResults.selfieUrl ||
              "",
            referenceName: referenceName.trim() || registrationData.verificationData?.referenceName,
            referencePhone: normalizedReferencePhone || registrationData.verificationData?.referencePhone,
          },
        }),
        30000,
        "Profile submission"
      );
      setRegistrationStep(3);

      setProcessingStage("Finalizing verification...");
      setProgress(100);
      router.push("/provider/pending-verification");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit documents.");
    } finally {
      setProcessing(false);
      setProcessingStage("");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ProviderSectionHeader
        eyebrow="Identity Verification"
        title="Upload required verification documents"
        subtitle="Secure onboarding requires ID and selfie validation before going live."
      />

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-5 sm:p-6"
      >
        <div className="grid gap-4">
          <label className="space-y-2">
            <span className="text-sm font-medium">Phone Number (required)</span>
            <input
              type="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="e.g. 9876543210"
              className="block h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Aadhaar Number (required)</span>
            <input
              type="text"
              inputMode="numeric"
              value={aadhaarNumber}
              onChange={(e) => setAadhaarNumber(e.target.value)}
              placeholder="12-digit Aadhaar number"
              className="block h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Aadhaar Front (required)</span>
            <input
              type="file"
              accept="image/*"
              className="block w-full rounded-md border border-input bg-background p-2 text-sm"
              onChange={(e) => setFiles((prev) => ({ ...prev, aadhaarFront: e.target.files?.[0] }))}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Aadhaar Back (required)</span>
            <input
              type="file"
              accept="image/*"
              className="block w-full rounded-md border border-input bg-background p-2 text-sm"
              onChange={(e) => setFiles((prev) => ({ ...prev, aadhaarBack: e.target.files?.[0] }))}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Selfie Upload (required)</span>
            <input
              type="file"
              accept="image/*"
              className="block w-full rounded-md border border-input bg-background p-2 text-sm"
              onChange={(e) => setFiles((prev) => ({ ...prev, selfie: e.target.files?.[0] }))}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Police Certificate (optional)</span>
            <input
              type="file"
              accept="image/*"
              className="block w-full rounded-md border border-input bg-background p-2 text-sm"
              onChange={(e) => setFiles((prev) => ({ ...prev, policeCert: e.target.files?.[0] }))}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Profile Photo (optional)</span>
            <input
              type="file"
              accept="image/*"
              className="block w-full rounded-md border border-input bg-background p-2 text-sm"
              onChange={(e) => setFiles((prev) => ({ ...prev, profilePhoto: e.target.files?.[0] }))}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Reference Name (optional)</span>
            <input
              type="text"
              value={referenceName}
              onChange={(e) => setReferenceName(e.target.value)}
              placeholder="Reference person name"
              className="block h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Reference Phone (optional)</span>
            <input
              type="tel"
              value={referencePhone}
              onChange={(e) => setReferencePhone(e.target.value)}
              placeholder="Reference phone number"
              className="block h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </label>
        </div>

        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <p className="inline-flex items-center gap-2 font-semibold">
            <LockKeyhole size={16} /> Data protection assurance
          </p>
          <p className="mt-1 text-emerald-800">
            Uploaded documents are encrypted, access-controlled, and used only for compliance verification.
          </p>
        </div>

        {processing ? (
          <div className="mt-5 rounded-lg border border-border bg-muted p-3">
            <p className="inline-flex items-center gap-2 text-sm font-medium">
              <Loader2 size={14} className="animate-spin" /> Verification processing
            </p>
            {processingStage ? (
              <p className="mt-1 text-xs text-muted-foreground">{processingStage}</p>
            ) : null}
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-background">
              <div className="h-full bg-foreground transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Progress: {progress}%</p>
          </div>
        ) : null}

        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={submitForVerification} disabled={!canSubmit || processing} className="h-11">
            Submit for Verification
          </Button>
          <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs">
            <ShieldCheck size={14} />
            Status: pending
          </span>
        </div>
      </motion.section>
    </div>
  );
}

