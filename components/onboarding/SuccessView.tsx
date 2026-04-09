"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { UserRole } from "@/lib/server/constants";

interface SuccessViewProps {
  name: string;
  role: UserRole; // ✅ typed — not loose string
  onComplete: () => void;
}

const SuccessView = ({ name, role, onComplete }: SuccessViewProps) => {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (countdown <= 0) {
      onComplete();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, onComplete]);

  const roleLabel =
    role === "provider"
      ? "service provider"
      : role === "admin"
      ? "admin"
      : "customer"; // ✅ display "customer" for role === "user"

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center text-center py-6"
    >
      <h2 className="text-2xl font-bold text-foreground mb-2">
        Welcome aboard, {name}!
      </h2>
      <p className="text-muted-foreground mb-2">
        Your {roleLabel} profile has been created.
      </p>

      <div className="mt-6 flex items-center gap-2">
        <motion.div
          className="w-2 h-2 rounded-full bg-accent"
          animate={{ scale: [1, 1.4, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
        />
        <span className="text-sm text-muted-foreground">
          Preparing your experience... {countdown}s
        </span>
      </div>
    </motion.div>
  );
};

export default SuccessView;