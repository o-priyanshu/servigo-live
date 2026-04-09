"use client";

import { motion } from "framer-motion";
import { Home, Wrench } from "lucide-react";
import type { UserRole } from "@/lib/server/constants";

interface StepRoleProps {
  role: UserRole | undefined;
  onChange: (role: UserRole) => void;
  onValidChange: (valid: boolean) => void;
}

const roles = [
  {
    value: "user" as const,        // ✅ "user" not "customer"
    title: "Customer",
    description: "I need services for my home or business",
    icon: Home,
  },
  {
    value: "provider" as const,
    title: "Service Provider",
    description: "I offer professional services to clients",
    icon: Wrench,
  },
];

const StepRole = ({ role, onChange, onValidChange }: StepRoleProps) => {
  const handleSelect = (value: UserRole) => {
    onChange(value);
    onValidChange(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">
          What brings you here?
        </h2>
        <p className="text-muted-foreground text-sm">
          Choose the role that best describes you.
        </p>
      </div>

      <div className="grid gap-4">
        {roles.map((r) => (
          <motion.button
            key={r.value}
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelect(r.value)}
            className={`role-card text-left flex items-start gap-5 ${
              role === r.value ? "role-card-selected" : ""
            }`}
          >
            <div
              className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center transition-colors duration-300 ${
                role === r.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              <r.icon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {r.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {r.description}
              </p>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};

export default StepRole;