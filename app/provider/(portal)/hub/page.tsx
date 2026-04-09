"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import ProviderSectionHeader from "@/components/provider/ProviderSectionHeader";
import { useAuth } from "@/context/AuthContext";
import { getHubLocation, getWorkerHub } from "@/services/firebase/workerHub";
import { useWorkerStore } from "@/store/workerStore";

export default function ProviderHubPage() {
  const { firebaseUser } = useAuth();
  const checkInAtHub = useWorkerStore((state) => state.checkInAtHub);
  const [hubId, setHubId] = useState<string | null>(null);
  const [hub, setHub] = useState<Awaited<ReturnType<typeof getHubLocation>>>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    if (!firebaseUser?.uid) return;
    void (async () => {
      const assigned = await getWorkerHub(firebaseUser.uid);
      setHubId(assigned.hubId);
      setHub(assigned.hub);
    })();
  }, [firebaseUser?.uid]);

  const mapsHref =
    hub && Number.isFinite(hub.lat) && Number.isFinite(hub.lng)
      ? `https://www.google.com/maps/dir/?api=1&destination=${hub.lat},${hub.lng}`
      : "#";

  return (
    <div className="space-y-6">
      <ProviderSectionHeader
        eyebrow="Hub"
        title="Assigned Hub"
        subtitle="Check in when your shift starts and access hub support quickly."
      />

      {hub ? (
        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">{hub.name}</h2>
          <p className="text-sm text-muted-foreground">{hub.address}</p>
          <p className="text-xs text-muted-foreground">
            Coordinates: {hub.lat.toFixed(5)}, {hub.lng.toFixed(5)}
          </p>

          <div className="grid gap-2 sm:grid-cols-3">
            <Button
              className="h-10"
              disabled={checkingIn || !hubId}
              onClick={() => {
                setCheckingIn(true);
                void checkInAtHub().finally(() => setCheckingIn(false));
              }}
            >
              {checkingIn ? "Checking in..." : "Hub Check-in"}
            </Button>

            <Button asChild variant="outline" className="h-10">
              <a href={mapsHref} target="_blank" rel="noreferrer">
                Open Directions
              </a>
            </Button>

            <Button
              variant="outline"
              className="h-10"
              onClick={() => alert(hub.phone ? `Call hub: ${hub.phone}` : "Hub contact not available")}
            >
              Contact Hub
            </Button>
          </div>
        </section>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          No hub assigned yet.
        </div>
      )}
    </div>
  );
}
