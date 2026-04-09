"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { User, Calendar, ChevronDown } from "lucide-react";
import { identitySchema, type IdentityData } from "@/lib/onboarding-schemas";

interface StepIdentityProps {
  data: Partial<IdentityData>;
  onChange: (data: Partial<IdentityData>) => void;
  onValidChange: (valid: boolean) => void;
}

const genderOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
];

const StepIdentity = ({ data, onChange, onValidChange }: StepIdentityProps) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (newData: Partial<IdentityData>) => {
    const result = identitySchema.safeParse(newData);
    if (result.success) {
      setErrors({});
      onValidChange(true);
    } else {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {  // ✅ .issues not .errors
        const field = issue.path[0];
        if (typeof field === "string") {
          fieldErrors[field] = issue.message;   // ✅ typed — no implicit any
        }
      });
      setErrors(fieldErrors);
      onValidChange(false);
    }
  };
  const update = (field: keyof IdentityData, value: string) => {
    const newData = { ...data, [field]: value };
    onChange(newData);
    validate(newData);
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
        <h2 className="text-2xl font-bold text-foreground mb-1">Tell us about yourself</h2>
        <p className="text-muted-foreground text-sm">We need a few details to get you started.</p>
      </div>

      {/* Full Name */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Full Name</label>
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Enter your full name"
            value={data.fullName || ""}
            onChange={(e) => update("fullName", e.target.value)}
            className="input-field w-full pl-12"
          />
        </div>
        {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
      </div>

      {/* Date of Birth */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Date of Birth</label>
        <div className="relative">
          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="date"
            value={data.dateOfBirth || ""}
            onChange={(e) => update("dateOfBirth", e.target.value)}
            className="input-field w-full pl-12"
          />
        </div>
        {errors.dateOfBirth && <p className="text-sm text-destructive">{errors.dateOfBirth}</p>}
      </div>

      {/* Gender */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Gender</label>
        <div className="relative">
          <select
            value={data.gender || ""}
            onChange={(e) => update("gender", e.target.value)}
            className="input-field w-full appearance-none pr-10"
          >
            <option value="" disabled>Select gender</option>
            {genderOptions.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
        </div>
        {errors.gender && <p className="text-sm text-destructive">{errors.gender}</p>}
      </div>
    </motion.div>
  );
};

export default StepIdentity;
