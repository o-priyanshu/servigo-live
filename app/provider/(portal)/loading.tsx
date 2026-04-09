import { ProviderSkeleton } from "@/components/provider/ProviderStates";

export default function ProviderPortalLoading() {
  return (
    <div className="space-y-4">
      <div className="h-16 animate-pulse rounded-xl border border-border bg-card/70" />
      <ProviderSkeleton rows={4} />
    </div>
  );
}
