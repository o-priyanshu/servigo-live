"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface StarInputProps {
  value: number;
  onChange: (value: number) => void;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  labels?: boolean;
}

const sizeMap = {
  sm: 16,
  md: 22,
  lg: 28,
} as const;

const labelMap: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

export default function StarInput({
  value,
  onChange,
  size = "md",
  disabled = false,
  labels = false,
}: StarInputProps) {
  const [hovered, setHovered] = useState(0);
  const activeValue = hovered || value;
  const iconSize = sizeMap[size];

  return (
    <div className="space-y-2">
      <div className="inline-flex items-center gap-1" role="radiogroup" aria-label="Rating input">
        {Array.from({ length: 5 }).map((_, index) => {
          const starValue = index + 1;
          const active = starValue <= activeValue;
          return (
            <button
              key={starValue}
              type="button"
              role="radio"
              aria-checked={value === starValue}
              aria-label={`${starValue} star${starValue > 1 ? "s" : ""}`}
              disabled={disabled}
              tabIndex={disabled ? -1 : 0}
              onMouseEnter={() => setHovered(starValue)}
              onMouseLeave={() => setHovered(0)}
              onFocus={() => setHovered(starValue)}
              onBlur={() => setHovered(0)}
              onClick={() => onChange(starValue)}
              onKeyDown={(event) => {
                if (disabled) return;
                if (event.key === "ArrowRight" || event.key === "ArrowUp") {
                  event.preventDefault();
                  onChange(Math.min(5, value + 1));
                }
                if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
                  event.preventDefault();
                  onChange(Math.max(1, value - 1));
                }
                if (event.key === "Home") {
                  event.preventDefault();
                  onChange(1);
                }
                if (event.key === "End") {
                  event.preventDefault();
                  onChange(5);
                }
              }}
              className="rounded-md p-1 outline-none transition hover:scale-105 focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:cursor-not-allowed"
            >
              <Star
                size={iconSize}
                className={active ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}
              />
            </button>
          );
        })}
      </div>
      {labels ? (
        <p className="text-sm text-muted-foreground">
          {labelMap[Math.max(1, Math.min(5, value))]}
        </p>
      ) : null}
    </div>
  );
}
