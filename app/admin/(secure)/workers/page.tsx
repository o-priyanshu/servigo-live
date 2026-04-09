"use client";

import { useEffect, useMemo, useState } from "react";
import { useAdminStore } from "@/store/adminStore";

export default function AdminWorkersPage() {
  const allWorkers = useAdminStore((state) => state.allWorkers);
  const fetchAllWorkers = useAdminStore((state) => state.fetchAllWorkers);
  const suspendWorker = useAdminStore((state) => state.suspendWorker);

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    void fetchAllWorkers();
  }, [fetchAllWorkers]);

  const filtered = useMemo(() => {
    return allWorkers.filter((worker) => {
      const statusOk = statusFilter === "all" || worker.verificationStatus === statusFilter;
      const query = search.trim().toLowerCase();
      const searchOk =
        !query ||
        worker.name.toLowerCase().includes(query) ||
        worker.phone.toLowerCase().includes(query);
      return statusOk && searchOk;
    });
  }, [allWorkers, search, statusFilter]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Workers</h1>

      <section className="flex flex-wrap gap-2 border border-zinc-800 bg-zinc-900 p-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm">
          <option value="all">All Status</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
          <option value="suspended">Suspended</option>
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or phone"
          className="h-9 min-w-64 border border-zinc-700 bg-zinc-950 px-3 text-sm"
        />
      </section>

      <section className="overflow-x-auto border border-zinc-800 bg-zinc-900 p-3">
        <table className="min-w-full text-sm">
          <thead className="text-left text-zinc-400">
            <tr>
              <th className="px-2 py-2">Name</th>
              <th className="px-2 py-2">Phone</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Trust Tier</th>
              <th className="px-2 py-2">Total Jobs</th>
              <th className="px-2 py-2">Rating</th>
              <th className="px-2 py-2">Joined</th>
              <th className="px-2 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((worker) => (
              <tr key={worker.uid} className="border-t border-zinc-800">
                <td className="px-2 py-2">{worker.name}</td>
                <td className="px-2 py-2">{worker.phone}</td>
                <td className="px-2 py-2">{worker.verificationStatus}</td>
                <td className="px-2 py-2">{worker.trustTier}</td>
                <td className="px-2 py-2">{worker.totalJobs}</td>
                <td className="px-2 py-2">{worker.rating.toFixed(1)}</td>
                <td className="px-2 py-2">{worker.createdAt?.toDate?.().toLocaleDateString?.() ?? "-"}</td>
                <td className="px-2 py-2">
                  <button className="text-red-300 underline" onClick={() => void suspendWorker(worker.uid)}>
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

