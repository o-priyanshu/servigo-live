"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, getDocs, query, where, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AdminCustomerDetailPage() {
  const params = useParams<{ customerId: string }>();
  const customerId = params?.customerId ?? "";
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [bookings, setBookings] = useState<number>(0);

  useEffect(() => {
    if (!customerId) return;
    void (async () => {
      const [userSnap, bookingSnap] = await Promise.all([
        getDoc(doc(db, "users", customerId)),
        getDocs(query(collection(db, "bookings"), where("customerId", "==", customerId))),
      ]);
      setProfile(userSnap.exists() ? (userSnap.data() as Record<string, unknown>) : null);
      setBookings(bookingSnap.size);
    })();
  }, [customerId]);

  if (!profile) return <p className="text-sm text-zinc-400">Customer not found.</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{String(profile.name ?? "Customer")}</h1>
      <p className="text-sm text-zinc-400">{String(profile.email ?? "")}</p>
      <section className="border border-zinc-800 bg-zinc-900 p-4 text-sm">
        <p>Total bookings: {bookings}</p>
        <p>Status: {profile.isBlocked ? "suspended" : "active"}</p>
      </section>
    </div>
  );
}
