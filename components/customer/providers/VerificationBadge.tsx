import { ShieldCheck } from "lucide-react";

interface VerificationBadgeProps {
  size?: "sm" | "md";
}

const VerificationBadge = ({ size = "sm" }: VerificationBadgeProps) => {
  const iconSize = size === "sm" ? 14 : 18;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
      <ShieldCheck size={iconSize} />
      Verified
    </span>
  );
};

export default VerificationBadge;
