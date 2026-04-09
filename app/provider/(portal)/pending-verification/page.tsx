"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock3, Headset, ShieldCheck } from "lucide-react";
import ProviderStatusPill from "@/components/provider/ProviderStatusPill";
import { useAuth } from "@/context/AuthContext";
import { getWorkerProfile } from "@/services/firebase/workerAuth";

export default function ProviderPendingVerificationPage() {
  const router = useRouter();
  const { firebaseUser } = useAuth();

  useEffect(() => {
    if (!firebaseUser?.uid) return;

    let cancelled = false;
    const checkStatus = async () => {
      const profile = await getWorkerProfile(firebaseUser.uid).catch(() => null);
      if (cancelled || !profile) return;

      if (profile.verificationStatus === "verified") {
        router.replace("/provider/dashboard");
      } else if (profile.verificationStatus === "suspended") {
        router.replace("/blocked");
      }
    };

    void checkStatus();
    const interval = setInterval(() => {
      void checkStatus();
    }, 8000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [firebaseUser?.uid, router]);

  return (
    <div className="grid min-h-[70vh] place-items-center">
      <section className="w-full max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-amber-100 text-amber-700">
          <Clock3 size={30} />
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Verification In Progress</h1>
        <p className="mt-2 text-muted-foreground">
          Your documents are under compliance review. We will notify you as soon as verification is complete.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <ProviderStatusPill status="pending" label="Pending Review" />
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
            <ShieldCheck size={12} /> Review ETA: 24-48 hrs
          </span>
        </div>

        <div className="mt-6 rounded-lg border border-border bg-muted/50 p-3 text-sm">
          Need urgent help?{" "}
          <Link href="/contact-support" className="font-semibold text-foreground underline">
            Contact support
          </Link>
        </div>
        <Link
          href="/provider/dashboard"
          className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground underline"
        >
          <Headset size={14} />
          Go to provider console
        </Link>
      </section>
    </div>
  );
}
