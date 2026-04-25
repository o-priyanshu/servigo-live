import type { JobStatus, VerificationStatus } from "@/lib/types/provider";

type Status = JobStatus | VerificationStatus | "online" | "offline" | "suspended";

const styles: Record<Status, string> = {
  incoming: "bg-amber-100 text-amber-800",
  accepted: "bg-blue-100 text-blue-800",
  on_the_way: "bg-cyan-100 text-cyan-800",
  in_progress: "bg-indigo-100 text-indigo-800",
  waiting_customer: "bg-amber-100 text-amber-800",
  extension_requested: "bg-orange-100 text-orange-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-rose-100 text-rose-800",
  pending: "bg-amber-100 text-amber-800",
  verified: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  suspended: "bg-slate-300 text-slate-800",
  online: "bg-emerald-100 text-emerald-800",
  offline: "bg-slate-200 text-slate-700",
};

interface ProviderStatusPillProps {
  status: Status;
  label?: string;
}

export default function ProviderStatusPill({ status, label }: ProviderStatusPillProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      {label ?? status.replaceAll("_", " ")}
    </span>
  );
}
