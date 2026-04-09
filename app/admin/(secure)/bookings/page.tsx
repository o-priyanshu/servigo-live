"use client";

import { useEffect, useState } from "react";
import { useAdminStore } from "@/store/adminStore";

export default function AdminBookingsPage() {
  const allBookings = useAdminStore((state) => state.allBookings);
  const fetchAllBookings = useAdminStore((state) => state.fetchAllBookings);

  const [status, setStatus] = useState("");
  const [service, setService] = useState("");

  useEffect(() => {
    void fetchAllBookings({ status: status || undefined, service: service || undefined });
  }, [fetchAllBookings, service, status]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Bookings</h1>

      <section className="flex flex-wrap gap-2 border border-zinc-800 bg-zinc-900 p-3">
        <input
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          placeholder="Status"
          className="h-9 border border-zinc-700 bg-zinc-950 px-3 text-sm"
        />
        <input
          value={service}
          onChange={(e) => setService(e.target.value)}
          placeholder="Service"
          className="h-9 border border-zinc-700 bg-zinc-950 px-3 text-sm"
        />
      </section>

      <section className="overflow-x-auto border border-zinc-800 bg-zinc-900 p-3">
        <table className="min-w-full text-sm">
          <thead className="text-left text-zinc-400">
            <tr>
              <th className="px-2 py-2">Booking ID</th>
              <th className="px-2 py-2">Customer</th>
              <th className="px-2 py-2">Worker</th>
              <th className="px-2 py-2">Service</th>
              <th className="px-2 py-2">Date</th>
              <th className="px-2 py-2">Amount</th>
              <th className="px-2 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {allBookings.map((booking) => (
              <tr key={booking.id} className="border-t border-zinc-800">
                <td className="px-2 py-2">{booking.id}</td>
                <td className="px-2 py-2">{booking.customerName}</td>
                <td className="px-2 py-2">{booking.workerName}</td>
                <td className="px-2 py-2">{booking.service}</td>
                <td className="px-2 py-2">{booking.scheduledTime?.toDate?.().toLocaleString?.() ?? "-"}</td>
                <td className="px-2 py-2">?{booking.amount}</td>
                <td className="px-2 py-2">{booking.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

