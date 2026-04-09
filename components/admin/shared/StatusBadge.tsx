interface StatusBadgeProps {
  status: string;
}

const colorMap: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  verified: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  rejected: "bg-rose-500/15 text-rose-300 border-rose-500/40",
  suspended: "bg-red-500/15 text-red-300 border-red-500/40",
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  warned: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  completed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  cancelled: "bg-zinc-600/30 text-zinc-300 border-zinc-600/40",
  in_progress: "bg-blue-500/15 text-blue-300 border-blue-500/40",
  confirmed: "bg-cyan-500/15 text-cyan-300 border-cyan-500/40",
  fraud_flagged: "bg-red-500/20 text-red-200 border-red-500/50",
  low: "bg-slate-500/15 text-slate-300 border-slate-500/40",
  medium: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  high: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  critical: "bg-red-500/20 text-red-200 border-red-500/50",
  open: "bg-rose-500/15 text-rose-300 border-rose-500/40",
  under_investigation: "bg-blue-500/15 text-blue-300 border-blue-500/40",
  dismissed: "bg-zinc-500/20 text-zinc-300 border-zinc-500/40",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const cls = colorMap[status] ?? "bg-zinc-700/20 text-zinc-300 border-zinc-700/40";
  return (
    <span className={`inline-flex items-center border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${cls}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

