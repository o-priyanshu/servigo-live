"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, ChevronDown, FileCheck, Loader2 } from "lucide-react";
import { uploadFileToCloudinary } from "@/lib/cloudinary-upload";
import type { UserRole } from "@/lib/server/constants";
import { SERVICE_CATEGORIES } from "@/lib/provider/constants";

// ─── Display labels for service categories ────────────────────────────────────

const SERVICE_CATEGORY_LABELS: Record<string, string> = {
  electrician: "Electrical",
  plumber: "Plumbing",
  cleaner: "Cleaning",
  carpenter: "Carpentry",
  appliance_repair: "Appliance Repair",
};

const SERVICE_INTERESTS = [
  "Home Repairs",
  "Renovations",
  "Cleaning Services",
  "Electrical Work",
  "Plumbing",
  "Moving & Assembly",
  "Outdoor Maintenance",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface StepVerificationProps {
  role: UserRole;
  data: {
    governmentIdPath?: string;
    serviceCategory?: string;
    primaryInterest?: string;
  };
  onChange: (data: Record<string, unknown>) => void;
  onValidChange: (valid: boolean) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const StepVerification = ({
  role,
  data,
  onChange,
  onValidChange,
}: StepVerificationProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // ─── File Upload to Firebase Storage ───────────────────────────────────────

  const uploadFile = useCallback(
    async (file: File) => {
      setFileError(null);

      if (!ALLOWED_TYPES.includes(file.type)) {
        setFileError("Only JPEG, PNG, or PDF files are allowed.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setFileError("File must be under 10MB.");
        return;
      }

      setUploading(true);
      setFileName(file.name);
      setUploadProgress(0);

      try {
        const fileUrl = await uploadFileToCloudinary(file, {
          folder: "verification",
          publicIdPrefix: "government-id",
          onProgress: (progress) => setUploadProgress(progress),
        });
        const newData = { ...data, governmentIdPath: fileUrl };
        onChange(newData);

        // ✅ VALIDATION: If provider, they need ID + Category. If customer, just category.
        if (role === "provider") {
          onValidChange(!!newData.serviceCategory);
        } else {
          onValidChange(true);
        }
      } catch {
        setFileError("Upload failed. Please try again.");
        setFileName(null);
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [data, onChange, onValidChange, role]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const updateField = (field: string, value: string) => {
    const newData = { ...data, [field]: value };
    onChange(newData);
    
    // ✅ FIX: Simplified validation to ensure the button enables immediately
    if (role === "provider") {
      // For providers, check if category is selected. 
      // (ID check is handled after upload completes)
      onValidChange(!!value || !!data.governmentIdPath);
    } else {
      // For customers, once they pick a primary interest, it is valid.
      onValidChange(!!value);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">
          {role === "provider" ? "Verify your identity" : "Almost there!"}
        </h2>
        <p className="text-muted-foreground text-sm">
          {role === "provider"
            ? "We need to verify your credentials before you can start."
            : "Tell us what services you're looking for."}
        </p>
      </div>

      {role === "provider" ? (
        <>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Government ID
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer ${
                dragActive
                  ? "border-accent bg-accent/5"
                  : data.governmentIdPath
                  ? "border-green-500 bg-green-50"
                  : "border-border hover:border-muted-foreground/40"
              }`}
            >
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={handleFileInput}
                disabled={uploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />

              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">
                    Uploading... {uploadProgress}%
                  </p>
                </div>
              ) : data.governmentIdPath ? (
                <div className="flex flex-col items-center gap-2">
                  <FileCheck className="h-8 w-8 text-green-500" />
                  <p className="text-sm font-medium text-foreground">
                    {fileName ?? "File uploaded"}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">
                    Drag & drop your ID here
                  </p>
                </div>
              )}
            </div>
            {fileError && (
              <p className="text-sm text-destructive">{fileError}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Service Category
            </label>
            <div className="relative">
              <select
                value={data.serviceCategory || ""}
                onChange={(e) => updateField("serviceCategory", e.target.value)}
                className="input-field w-full appearance-none pr-10"
              >
                <option value="" disabled>Select your category</option>
                {SERVICE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {SERVICE_CATEGORY_LABELS[c] ?? c}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Primary Service Interest
          </label>
          <div className="relative">
            <select
              value={data.primaryInterest || ""}
              onChange={(e) => updateField("primaryInterest", e.target.value)}
              className="input-field w-full appearance-none pr-10"
            >
              <option value="" disabled>What do you need help with?</option>
              {SERVICE_INTERESTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default StepVerification;
