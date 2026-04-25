"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import WorkerRatingDisplay from "@/components/rating/WorkerRatingDisplay";
import ProviderSectionHeader from "@/components/provider/ProviderSectionHeader";
import ProviderStatusPill from "@/components/provider/ProviderStatusPill";
import { useAuth } from "@/context/AuthContext";
import type { ServiceCategory } from "@/lib/types/index";
import { getWorkerProfile, updateWorkerProfile, uploadWorkerDocument } from "@/services/firebase/workerAuth";
import { useWorkerStore } from "@/store/workerStore";

  export default function ProviderProfilePage() {
  const { firebaseUser } = useAuth();
  const worker = useWorkerStore((state) => state.worker);
  const setWorker = useWorkerStore((state) => state.setWorker);

  const [bio, setBio] = useState("");
  const [radius, setRadius] = useState(6);
  const [experience, setExperience] = useState(1);
  const [services, setServices] = useState("");
  const [languages, setLanguages] = useState("");
  const [tools, setTools] = useState("");
  const [serviceablePincodes, setServiceablePincodes] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!firebaseUser?.uid) return;
    void (async () => {
      const profile = await getWorkerProfile(firebaseUser.uid);
      if (!profile) return;
      setWorker(profile);
      setBio(profile.bio ?? "");
      setRadius(profile.serviceRadius ?? 6);
      const yearsFromTopLevel = Number((profile as { yearsOfExperience?: unknown }).yearsOfExperience);
      const yearsFromSkills = Number(profile.skills?.[0]?.experience ?? 1);
      setExperience(
        Number.isFinite(yearsFromTopLevel)
          ? yearsFromTopLevel
          : Number.isFinite(yearsFromSkills)
            ? yearsFromSkills
            : 1
      );

      const serviceFromSkills = (profile.skills ?? [])
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object") {
            return String((item as { service?: unknown }).service ?? "");
          }
          return "";
        })
        .map((value) => value.trim())
        .filter(Boolean);
      const fallbackCategory = String(
        (profile as { serviceCategory?: unknown }).serviceCategory ?? ""
      ).trim();
      const normalizedServices =
        serviceFromSkills.length > 0
          ? serviceFromSkills
          : fallbackCategory
            ? [fallbackCategory]
            : [];
      setServices(normalizedServices.join(", "));
      setLanguages((profile.languages ?? []).join(", "));
      setTools((profile.tools ?? []).join(", "));
      setServiceablePincodes((profile.serviceablePincodes ?? []).join(", "));
    })();
  }, [firebaseUser?.uid, setWorker]);

  return (
    <div className="space-y-6">
      <ProviderSectionHeader
        eyebrow="Identity"
        title="Provider Profile"
        subtitle="Manage your public profile and service settings."
        right={<ProviderStatusPill status={worker?.verificationStatus ?? "pending"} />}
      />

      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <article className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-16 w-16 place-items-center rounded-xl bg-emerald-100 text-2xl font-bold text-emerald-800">
              {(worker?.name ?? "P").charAt(0)}
            </span>
            <div>
              <h2 className="text-2xl font-bold">{worker?.name ?? "Provider"}</h2>
              <p className="text-sm text-muted-foreground">{worker?.email ?? ""}</p>
            </div>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium">Experience (years)</span>
            <Input type="number" min={0} value={experience} onChange={(e) => setExperience(Number(e.target.value))} />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">Service Categories</span>
            <Input value={services} onChange={(e) => setServices(e.target.value)} />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">Bio</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">Service Radius (km): {radius}</span>
            <Input type="range" min={1} max={10} value={radius} onChange={(e) => setRadius(Number(e.target.value))} />
          </label>

          <Button
            className="h-11"
            disabled={saving || !firebaseUser?.uid}
            onClick={async () => {
              if (!firebaseUser?.uid) return;
              setSaving(true);
              setSaveMessage("");
              setSaveError("");
              const parsedServices = services
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
                .map((item) => item.toLowerCase())
                .filter((item, index, all) => all.indexOf(item) === index);
              const normalizedPrimaryService = parsedServices[0]?.toLowerCase() ?? "";
              const allowedServices = new Set<ServiceCategory>([
                "electrician",
                "plumber",
                "cleaner",
                "carpenter",
                "appliance_repair",
              ]);
              const serviceCategory: ServiceCategory = allowedServices.has(normalizedPrimaryService as ServiceCategory)
                ? (normalizedPrimaryService as ServiceCategory)
                : "electrician";
              try {
                await updateWorkerProfile(firebaseUser.uid, {
                  serviceRadius: radius,
                  name: worker?.name ?? "Provider",
                  bio: bio.trim(),
                  yearsOfExperience: experience,
                  serviceCategory,
                  skills: parsedServices.map((service) => ({
                    service,
                    experience,
                    skillScore: 0,
                  })),
                  tools: tools
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                  languages: languages
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                  serviceablePincodes: serviceablePincodes
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                });
                const latest = await getWorkerProfile(firebaseUser.uid);
                if (latest) setWorker(latest);
                setSaveMessage("Profile saved successfully.");
              } catch (error) {
                setSaveError(error instanceof Error ? error.message : "Could not save profile.");
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Saving..." : "Save Profile"}
          </Button>
          {saveMessage ? <p className="text-sm text-emerald-700">{saveMessage}</p> : null}
          {saveError ? <p className="text-sm text-rose-600">{saveError}</p> : null}

          <label className="block space-y-2">
            <span className="text-sm font-medium">Languages (comma-separated)</span>
            <Input value={languages} onChange={(e) => setLanguages(e.target.value)} />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">Tools (comma-separated)</span>
            <Input value={tools} onChange={(e) => setTools(e.target.value)} />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">Serviceable Pincodes</span>
            <Input value={serviceablePincodes} onChange={(e) => setServiceablePincodes(e.target.value)} />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">Upload additional document</span>
            <Input type="file" accept="image/*,.pdf" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} />
          </label>
          <Button
            variant="outline"
            className="h-11"
            disabled={uploadingDoc || !firebaseUser?.uid || !uploadFile}
            onClick={() => {
              if (!firebaseUser?.uid || !uploadFile) return;
              setUploadingDoc(true);
              void uploadWorkerDocument(firebaseUser.uid, "certificate", uploadFile)
                .then((url) =>
                  updateWorkerProfile(firebaseUser.uid, {
                    verificationData: {
                      ...(worker?.verificationData ?? {
                        aadhaarNumber: "",
                        aadhaarFrontUrl: "",
                        aadhaarBackUrl: "",
                        selfieUrl: "",
                      }),
                      policeCertificateUrl: url,
                    },
                  })
                )
                .finally(() => setUploadingDoc(false));
            }}
          >
            {uploadingDoc ? "Uploading..." : "Upload Document"}
          </Button>

          <Button asChild variant="outline" className="h-11">
            <Link href="/provider/bank-details">Manage Bank Details</Link>
          </Button>
        </article>

        <article className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h3 className="text-lg font-semibold">Trust & Performance</h3>
          <p className="inline-flex items-center gap-2 text-sm">
            <Star size={16} className="fill-amber-400 text-amber-400" />
            {(worker?.averageRating ?? worker?.rating ?? 0).toFixed(1)} ({worker?.totalRatings ?? worker?.ratingCount ?? 0} reviews)
          </p>
          <p className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            <ShieldCheck size={16} />
            Verification badge active
          </p>
          {firebaseUser?.uid ? <WorkerRatingDisplay workerId={firebaseUser.uid} /> : null}
        </article>
      </section>
    </div>
  );
}

