"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function DashboardNotFound() {
  const pathname = usePathname();

  useEffect(() => {
    console.error("404 Error: attempted dashboard route:", pathname);
  }, [pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-slate-900">404</h1>
        <p className="mb-4 text-xl text-slate-600">Page not found</p>
        <Link
          href="/dashboard"
          className="text-slate-900 underline hover:text-slate-700"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}