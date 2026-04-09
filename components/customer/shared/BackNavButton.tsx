"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface BackNavButtonProps {
  from?: string;
  fallbackHref: string;
  className?: string;
}

function isAllowedReturnPath(path: string): boolean {
  return path === "/dashboard?tab=home" || path === "/dashboard?tab=bookings";
}

export default function BackNavButton({ from, fallbackHref, className }: BackNavButtonProps) {
  const router = useRouter();
  const safeFrom = from && isAllowedReturnPath(from) ? from : fallbackHref;

  return (
    <button
      type="button"
      onClick={() => {
        router.push(safeFrom);
      }}
      className={className}
    >
      <ArrowLeft size={14} />
      Back
    </button>
  );
}
