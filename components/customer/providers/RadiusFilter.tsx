"use client";

import { motion } from "framer-motion";
import type { RadiusOption } from "@/components/customer/shared/types";

interface RadiusFilterProps {
  selected: RadiusOption;
  onChange: (radius: RadiusOption) => void;
}

const options: RadiusOption[] = [1, 3, 5, 10];

const RadiusFilter = ({ selected, onChange }: RadiusFilterProps) => {
  return (
    <div className="flex items-center gap-2">
      {options.map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={`relative rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
            selected === r
              ? "border-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
          }`}
        >
          {selected === r && (
            <motion.div
              layoutId="radius-bg"
              className="absolute inset-0 rounded-full bg-primary shadow-sm"
              transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            />
          )}
          <span className="relative z-10">{r} km</span>
        </button>
      ))}
    </div>
  );
};

export default RadiusFilter;
