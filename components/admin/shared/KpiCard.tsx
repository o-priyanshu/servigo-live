import type { LucideIcon } from "lucide-react";
import AnimatedCounter from "@/components/admin/shared/AnimatedCounter";

interface KpiCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  prefix?: string;
  suffix?: string;
}

export default function KpiCard({ title, value, icon: Icon, prefix = "", suffix = "" }: KpiCardProps) {
  return (
    <div className="border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] uppercase tracking-wider text-zinc-400">{title}</p>
        <Icon size={16} className="text-zinc-300" />
      </div>
      <p className="mt-2 text-2xl font-semibold text-zinc-100">
        <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
      </p>
    </div>
  );
}

