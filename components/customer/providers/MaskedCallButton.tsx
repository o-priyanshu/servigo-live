"use client";

import { PhoneCall } from "lucide-react";

interface MaskedCallButtonProps {
  className?: string;
}

export default function MaskedCallButton({ className }: MaskedCallButtonProps) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        window.alert(
          "Call will connect you to worker without sharing numbers."
        );
      }}
    >
      <PhoneCall size={14} /> Call Worker (Masked)
    </button>
  );
}
