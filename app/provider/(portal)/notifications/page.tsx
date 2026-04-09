"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import ProviderSectionHeader from "@/components/provider/ProviderSectionHeader";
import { useAuth } from "@/context/AuthContext";
import { getWorkerProfile } from "@/services/firebase/workerAuth";
import { useWorkerStore } from "@/store/workerStore";

export default function ProviderNotificationsPage() {
  const router = useRouter();
  const { firebaseUser } = useAuth();

  const notifications = useWorkerStore((state) => state.notifications);
  const setWorker = useWorkerStore((state) => state.setWorker);
  const fetchNotifications = useWorkerStore((state) => state.fetchNotifications);
  const subscribeToNotifications = useWorkerStore((state) => state.subscribeToNotifications);
  const markNotificationRead = useWorkerStore((state) => state.markNotificationRead);

  useEffect(() => {
    if (!firebaseUser?.uid) return;
    let unsub: (() => void) | null = null;

    void (async () => {
      const profile = await getWorkerProfile(firebaseUser.uid);
      if (profile) setWorker(profile);
      await fetchNotifications();
      unsub = subscribeToNotifications();
    })();

    return () => {
      unsub?.();
    };
  }, [fetchNotifications, firebaseUser?.uid, setWorker, subscribeToNotifications]);

  function openNotification(item: (typeof notifications)[number]) {
    void markNotificationRead(item.id);

    if (item.jobId) {
      router.push(`/provider/job/${item.jobId}`);
      return;
    }
    if (item.bookingId) {
      router.push(`/provider/jobs`);
      return;
    }

    if (item.type === "payment_released") {
      router.push("/provider/earnings");
      return;
    }
    if (item.type === "verification_status") {
      router.push("/provider/profile");
      return;
    }

    router.push("/provider/dashboard");
  }

  return (
    <div className="space-y-6">
      <ProviderSectionHeader
        eyebrow="Alerts"
        title="Notifications"
        subtitle="Stay updated on jobs, verification, and payout events."
      />

      {notifications.length ? (
        <div className="space-y-2">
          {notifications.map((item) => (
            <button
              key={item.id}
              onClick={() => openNotification(item)}
              className={`w-full rounded-xl border p-4 text-left ${
                item.read ? "border-border bg-card" : "border-emerald-300 bg-emerald-50"
              }`}
            >
              <p className="font-semibold">{item.title || "Notification"}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {item.createdAt?.toDate?.().toLocaleString?.() ?? "Just now"}
              </p>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          No notifications yet.
        </div>
      )}

      {notifications.some((item) => !item.read) ? (
        <Button
          variant="outline"
          className="h-10"
          onClick={() => {
            notifications
              .filter((item) => !item.read)
              .forEach((item) => void markNotificationRead(item.id));
          }}
        >
          Mark all as read
        </Button>
      ) : null}
    </div>
  );
}
