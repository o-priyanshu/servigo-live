"use client";

import type { ServiceCategory } from "@/lib/types/index";
import { motion } from "framer-motion";
import { Zap, Droplets, Sparkles, Hammer, Wrench } from "lucide-react";

interface CategoryFilterProps {
  selected: ServiceCategory | "All";
  onChange: (cat: ServiceCategory | "All") => void;
}

const categories: {
  value: ServiceCategory | "All";
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "All", label: "All", icon: null },
  { value: "electrician", label: "Electrician", icon: <Zap size={14} /> },
  { value: "plumber", label: "Plumber", icon: <Droplets size={14} /> },
  { value: "cleaner", label: "Cleaner", icon: <Sparkles size={14} /> },
  { value: "carpenter", label: "Carpenter", icon: <Hammer size={14} /> },
  { value: "appliance_repair", label: "Appliance Repair", icon: <Wrench size={14} /> },
];

const CategoryFilter = ({ selected, onChange }: CategoryFilterProps) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {categories.map(({ value, label, icon }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`relative flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
            selected === value
              ? "border-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
          }`}
        >
          {selected === value && (
            <motion.div
              layoutId="category-bg"
              className="absolute inset-0 rounded-full bg-primary shadow-sm"
              transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            {icon}
            {label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;
