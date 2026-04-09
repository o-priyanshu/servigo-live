"use client";

import { useEffect, useMemo, useState } from "react";
import { useAdminStore } from "@/store/adminStore";

export default function AdminCustomersPage() {
  const allCustomers = useAdminStore((state) => state.allCustomers);
  const fetchAllCustomers = useAdminStore((state) => state.fetchAllCustomers);
  const suspendCustomer = useAdminStore((state) => state.suspendCustomer);

  const [search, setSearch] = useState("");

  useEffect(() => {
    void fetchAllCustomers();
  }, [fetchAllCustomers]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return allCustomers;
    return allCustomers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(query) ||
        customer.email.toLowerCase().includes(query) ||
        (customer.phone ?? "").toLowerCase().includes(query)
    );
  }, [allCustomers, search]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Customers</h1>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search customer"
        className="h-9 min-w-64 border border-zinc-700 bg-zinc-950 px-3 text-sm"
      />

      <section className="overflow-x-auto border border-zinc-800 bg-zinc-900 p-3">
        <table className="min-w-full text-sm">
          <thead className="text-left text-zinc-400">
            <tr>
              <th className="px-2 py-2">Name</th>
              <th className="px-2 py-2">Email</th>
              <th className="px-2 py-2">Phone</th>
              <th className="px-2 py-2">Bookings</th>
              <th className="px-2 py-2">Spent</th>
              <th className="px-2 py-2">Joined</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((customer) => (
              <tr key={customer.id} className="border-t border-zinc-800">
                <td className="px-2 py-2">{customer.name}</td>
                <td className="px-2 py-2">{customer.email}</td>
                <td className="px-2 py-2">{customer.phone ?? "-"}</td>
                <td className="px-2 py-2">{customer.totalBookings}</td>
                <td className="px-2 py-2">?{customer.totalSpent}</td>
                <td className="px-2 py-2">{customer.createdAt?.toDate?.().toLocaleDateString?.() ?? "-"}</td>
                <td className="px-2 py-2">{customer.status}</td>
                <td className="px-2 py-2">
                  <button className="text-red-300 underline" onClick={() => void suspendCustomer(customer.id)}>
                    Suspend
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

