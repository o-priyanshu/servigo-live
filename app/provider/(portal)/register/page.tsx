"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProviderSectionHeader from "@/components/provider/ProviderSectionHeader";
import type { ProviderCategory } from "@/lib/types/provider";
import { useWorkerStore } from "@/store/workerStore";
import { useAuth } from "@/context/AuthContext";
import { getWorkerProfile } from "@/services/firebase/workerAuth";

type RegisterForm = {
  city: string;
  customCity: string;
  workAddress: string;
  primaryPincode: string;
  additionalPincodes: string;
  radiusKm: number;
  category: ProviderCategory;
  yearsOfExperience: number;
  bio: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
};

const categories: { value: ProviderCategory; label: string }[] = [
  { value: "electrician", label: "Electrician" },
  { value: "plumber", label: "Plumber" },
  { value: "cleaner", label: "Cleaner" },
  { value: "carpenter", label: "Carpenter" },
  { value: "appliance_repair", label: "Appliance Repair" },
];

const cities = ["Bengaluru", "Mumbai", "Delhi", "Hyderabad", "Pune", "Chennai"];

export default function ProviderRegisterPage() {
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const [form, setForm] = useState<RegisterForm>({
    city: "Bengaluru",
    customCity: "",
    workAddress: "",
    primaryPincode: "",
    additionalPincodes: "",
    radiusKm: 6,
    category: "electrician",
    yearsOfExperience: 1,
    bio: "",
    accountName: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    upiId: "",
  });
  const [loading, setLoading] = useState(false);

  const setRegistrationData = useWorkerStore((state) => state.setRegistrationData);
  const setRegistrationStep = useWorkerStore((state) => state.setRegistrationStep);

  useEffect(() => {
    if (!firebaseUser?.uid) return;
    let cancelled = false;
    void (async () => {
      const existing = await getWorkerProfile(firebaseUser.uid).catch(() => null);
      if (cancelled || !existing) return;
      if (existing.verificationStatus === "pending" || existing.verificationStatus === "rejected") {
        router.replace("/provider/pending-verification");
        return;
      }
      router.replace("/provider/dashboard");
    })();
    return () => {
      cancelled = true;
    };
  }, [firebaseUser?.uid, router]);

  const formError = useMemo(() => {
    const normalizedPrimaryPincode = form.primaryPincode.replace(/\D/g, "");
    if (form.city === "Other" && form.customCity.trim().length < 2) {
      return "Please enter your city name.";
    }
    if (!/^\d{6}$/.test(normalizedPrimaryPincode)) {
      return "Primary service pincode must be exactly 6 digits.";
    }
    if (form.yearsOfExperience < 0 || form.yearsOfExperience > 60) return "Experience must be between 0 and 60 years.";
    if (form.radiusKm < 1 || form.radiusKm > 500) return "Service radius must be between 1 and 500 km.";
    if (form.bio.trim().length < 20) return "Bio must be at least 20 characters.";
    if (!form.accountName.trim() || !form.bankName.trim()) return "Bank account name and bank name are required.";
    if (!/^\d{9,18}$/.test(form.accountNumber.trim())) return "Account number must be 9-18 digits.";
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifscCode.trim().toUpperCase())) return "Enter a valid IFSC code.";
    if (form.upiId.trim() && !/^[\w.-]{2,}@[\w.-]{2,}$/.test(form.upiId.trim())) return "Enter a valid UPI ID.";
    return "";
  }, [form]);

  function update<K extends keyof RegisterForm>(key: K, value: RegisterForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onContinue(e: FormEvent) {
    e.preventDefault();
    if (formError) return;

    setLoading(true);
    try {
      const resolvedCity = form.city === "Other" ? form.customCity.trim() : form.city;
      const normalizedPrimaryPincode = form.primaryPincode.replace(/\D/g, "");
      const extraPincodes = form.additionalPincodes
        .split(",")
        .map((part) => part.replace(/\D/g, ""))
        .filter((pin) => /^\d{6}$/.test(pin));
      const serviceablePincodes = Array.from(
        new Set([normalizedPrimaryPincode, ...extraPincodes])
      );
      const fullAddress = form.workAddress.trim() || resolvedCity;

      setRegistrationData({
        address: { fullAddress, lat: 0, lng: 0, pincode: normalizedPrimaryPincode },
        serviceRadius: form.radiusKm,
        serviceablePincodes,
        skills: [{ service: form.category, experience: form.yearsOfExperience, skillScore: 0 }],
        tools: [],
        languages: [],
        bankDetails: {
          accountName: form.accountName.trim(),
          bankName: form.bankName.trim(),
          accountNumber: form.accountNumber.trim(),
          ifscCode: form.ifscCode.trim().toUpperCase(),
          upiId: form.upiId.trim() || undefined,
        },
      });
      setRegistrationStep(2);
      router.push("/provider/document-upload");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ProviderSectionHeader
        eyebrow="Provider Onboarding"
        title="Set up your service profile"
        subtitle="Complete profile details, then submit mandatory documents for admin verification."
      />

      <motion.form
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={onContinue}
        className="rounded-xl border border-border bg-card p-5 sm:p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium">Service Category</span>
            <select
              value={form.category}
              onChange={(e) => update("category", e.target.value as ProviderCategory)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">City</span>
            <select
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {cities.map((city) => (
                <option key={city}>{city}</option>
              ))}
              <option value="Other">Other</option>
            </select>
          </label>
          {form.city === "Other" ? (
            <label className="space-y-2">
              <span className="text-sm font-medium">Your City</span>
              <Input
                value={form.customCity}
                onChange={(e) => update("customCity", e.target.value)}
                placeholder="Enter your city"
              />
            </label>
          ) : null}

          <label className="space-y-2 sm:col-span-2">
            <span className="text-sm font-medium">Work Area / Address</span>
            <Input
              value={form.workAddress}
              onChange={(e) => update("workAddress", e.target.value)}
              placeholder="Ex: Koramangala, 1st Block"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Primary Service Pincode</span>
            <Input
              value={form.primaryPincode}
              onChange={(e) => update("primaryPincode", e.target.value)}
              placeholder="6-digit pincode"
              inputMode="numeric"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Additional Serviceable Pincodes</span>
            <Input
              value={form.additionalPincodes}
              onChange={(e) => update("additionalPincodes", e.target.value)}
              placeholder="Comma separated, ex: 560034,560038"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Years of Experience</span>
            <Input
              type="number"
              min={0}
              max={60}
              value={form.yearsOfExperience}
              onChange={(e) => update("yearsOfExperience", Number(e.target.value))}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Service Radius (km)</span>
            <Input
              type="number"
              min={1}
              max={500}
              value={form.radiusKm}
              onChange={(e) => update("radiusKm", Number(e.target.value))}
            />
          </label>

          <label className="space-y-2 sm:col-span-2">
            <span className="text-sm font-medium">Professional Bio</span>
            <textarea
              value={form.bio}
              onChange={(e) => update("bio", e.target.value)}
              placeholder="Describe your experience, work quality standards, and the types of jobs you handle."
              className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Account Holder Name</span>
            <Input value={form.accountName} onChange={(e) => update("accountName", e.target.value)} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Bank Name</span>
            <Input value={form.bankName} onChange={(e) => update("bankName", e.target.value)} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Account Number</span>
            <Input value={form.accountNumber} onChange={(e) => update("accountNumber", e.target.value)} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">IFSC Code</span>
            <Input value={form.ifscCode} onChange={(e) => update("ifscCode", e.target.value.toUpperCase())} />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className="text-sm font-medium">UPI ID (optional)</span>
            <Input value={form.upiId} onChange={(e) => update("upiId", e.target.value)} />
          </label>
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <ShieldCheck size={16} />
          After document submission, profile status becomes <span className="font-semibold">Pending Verification</span> for admin review.
        </div>

        {formError ? <p className="mt-3 text-sm font-medium text-rose-600">{formError}</p> : null}

        <Button type="submit" className="mt-5 h-11 w-full sm:w-auto" disabled={loading || !!formError}>
          {loading ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" /> Saving
            </>
          ) : (
            "Continue to Document Upload"
          )}
        </Button>
      </motion.form>
    </div>
  );
}

