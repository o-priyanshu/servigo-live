import { BriefcaseBusiness } from "lucide-react";

interface ProviderEmptyStateProps {
  title: string;
  desc: string;
}

export function ProviderEmptyState({ title, desc }: ProviderEmptyStateProps) {
  return (
    <div className="grid min-h-52 place-items-center rounded-xl border border-dashed border-border bg-card p-6 text-center">
      <div>
        <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-muted">
          <BriefcaseBusiness size={24} className="text-muted-foreground" />
        </span>
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

export function ProviderSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card/70" />
      ))}
    </div>
  );
}
