import type { LucideIcon } from "lucide-react";

interface ProviderStatCardProps {
  title: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
}

export default function ProviderStatCard({ title, value, hint, icon: Icon }: ProviderStatCardProps) {
  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</p>
        <Icon size={16} className="text-muted-foreground" />
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </article>
  );
}
