"use client";

import { LocateFixed, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  hasLocationAccess: boolean;
  onRequestLocation: () => void;
  manualFallback?: React.ReactNode;
  children: React.ReactNode;
}

export default function LocationGate({
  hasLocationAccess,
  onRequestLocation,
  manualFallback,
  children,
}: Props) {
  if (!hasLocationAccess) {
    return (
      <section className="rounded-2xl border border-border/70 bg-card p-6 text-center shadow-sm md:min-h-[320px] lg:flex lg:flex-col lg:justify-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
          <LocateFixed size={24} />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Enable Location</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Allow location access to discover providers near you.
        </p>
        <Button
          onClick={onRequestLocation}
          className="mt-5 h-11 rounded-xl bg-foreground px-6 text-background hover:bg-foreground/90"
        >
          <MapPin size={15} className="mr-2" />
          Allow Location Access
        </Button>
        {manualFallback ? <div className="mt-4 text-left">{manualFallback}</div> : null}
      </section>
    );
  }

  return <>{children}</>;
}
