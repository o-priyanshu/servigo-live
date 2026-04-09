"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import ProviderSectionHeader from "@/components/provider/ProviderSectionHeader";
import { useAuth } from "@/context/AuthContext";
import { getWorkerProfile, updateWorkerProfile } from "@/services/firebase/workerAuth";
import { useWorkerStore } from "@/store/workerStore";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const slots = ["08:00-10:00", "10:00-12:00", "12:00-14:00", "14:00-16:00", "16:00-18:00", "18:00-20:00"];

export default function ProviderAvailabilityPage() {
  const { firebaseUser } = useAuth();
  const setWorker = useWorkerStore((state) => state.setWorker);
  const setAvailability = useWorkerStore((state) => state.setAvailability);
  const isAvailable = useWorkerStore((state) => state.isAvailable);

  const [selectedDay, setSelectedDay] = useState("Mon");
  const [activeSlots, setActiveSlots] = useState<string[]>(["10:00-12:00", "14:00-16:00", "16:00-18:00"]);
  const [emergency, setEmergency] = useState(true);
  const [vacation, setVacation] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!firebaseUser?.uid) return;
    void (async () => {
      const profile = await getWorkerProfile(firebaseUser.uid);
      if (!profile) return;
      setWorker(profile);
      const config = profile.availabilityConfig;
      if (config?.weeklySlots?.[selectedDay]) {
        setActiveSlots(config.weeklySlots[selectedDay]);
      }
      if (typeof config?.emergencyAvailable === "boolean") setEmergency(config.emergencyAvailable);
      if (typeof config?.vacationMode === "boolean") setVacation(config.vacationMode);
    })();
  }, [firebaseUser?.uid, selectedDay, setWorker]);

  function toggleSlot(slot: string) {
    setActiveSlots((prev) => (prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]));
  }

  return (
    <div className="space-y-6">
      <ProviderSectionHeader
        eyebrow="Service Availability"
        title="Schedule & Availability"
        subtitle="Set weekly slots, emergency availability, and vacation mode."
      />

      <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <article className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Weekly Schedule</h2>
          <div className="mt-3 grid grid-cols-7 gap-2">
            {days.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`rounded-md px-2 py-2 text-sm ${selectedDay === day ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}
              >
                {day}
              </button>
            ))}
          </div>

          <h3 className="mt-5 text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Time Slots ({selectedDay})
          </h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {slots.map((slot) => (
              <button
                key={slot}
                onClick={() => toggleSlot(slot)}
                className={`rounded-md border px-3 py-2 text-left text-sm ${
                  activeSlots.includes(slot)
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                {slot}
              </button>
            ))}
          </div>
        </article>

        <article className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Availability Controls</h2>

          <label className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
            Emergency Availability
            <input type="checkbox" checked={emergency} onChange={(e) => setEmergency(e.target.checked)} />
          </label>

          <label className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
            Vacation Mode
            <input type="checkbox" checked={vacation} onChange={(e) => setVacation(e.target.checked)} />
          </label>

          <p className="rounded-lg border border-border bg-muted p-3 text-xs text-muted-foreground">
            Vacation mode hides your profile from new requests until re-enabled.
          </p>

          <Button
            className="h-11 w-full"
            disabled={saving || !firebaseUser?.uid}
            onClick={() => {
              if (!firebaseUser?.uid) return;
              setSaving(true);
              void Promise.all([
                setAvailability(!vacation && isAvailable),
                updateWorkerProfile(firebaseUser.uid, {
                  availabilityConfig: {
                    weeklySlots: { [selectedDay]: activeSlots },
                    emergencyAvailable: emergency,
                    vacationMode: vacation,
                  },
                }),
              ]).finally(() => setSaving(false));
            }}
          >
            {saving ? "Saving..." : "Save Availability"}
          </Button>
        </article>
      </section>
    </div>
  );
}

