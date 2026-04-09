"use client";

import { Circle } from "lucide-react";

interface AvailabilityBadgeProps {
  isOnline: boolean;
  status?: "online" | "offline" | "busy";
}

const AvailabilityBadge = ({ isOnline, status }: AvailabilityBadgeProps) => {
  const current = status ?? (isOnline ? "online" : "offline");
  const isBusy = current === "busy";
  const isActive = current === "online";
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        isBusy ? "text-amber-600" : isActive ? "text-emerald-600" : "text-muted-foreground"
      }`}
    >
      <Circle
        size={8}
        className={
          isBusy
            ? "fill-amber-600 text-amber-600"
            : isActive
            ? "fill-emerald-600 text-emerald-600"
            : "fill-muted-foreground text-muted-foreground"
        }
      />
      {isBusy ? "Busy" : isActive ? "Online" : "Offline"}
    </span>
  );
};

export default AvailabilityBadge;
