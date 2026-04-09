"use client";

import Link from "next/link";

export default function DashboardOnboardingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          Complete onboarding
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          Your profile setup is incomplete. Finish onboarding to unlock
          dashboard features.
        </p>
        <Link
          href="/onboarding"
          className="mt-6 inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
        >
          Go to onboarding
        </Link>
      </div>
    </div>
  );
}