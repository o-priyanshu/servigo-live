"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { WorkerProfile } from "@/services/firebase/types";
import { getWorkerJobsForAdmin } from "@/services/firebase/admin";

type WorkerJobSummary = {
  id: string;
  status: string;
  amount: number;
};

export default function AdminWorkerDetailPage() {
  const params = useParams<{ workerId: string }>();
  const workerId = params?.workerId ?? "";
  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [jobs, setJobs] = useState<WorkerJobSummary[]>([]);

  useEffect(() => {
    if (!workerId) return;
    void (async () => {
      const snap = await getDoc(doc(db, "providers", workerId));
      if (snap.exists()) {
        setWorker({ ...(snap.data() as WorkerProfile), uid: snap.id });
      }
      const workerJobs = await getWorkerJobsForAdmin(workerId);
      setJobs(workerJobs.map((job) => ({ id: job.id, status: job.status, amount: job.price?.base ?? 0 })));
    })();
  }, [workerId]);

  if (!worker) {
    return <p className="text-sm text-zinc-400">Worker not found.</p>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{worker.name}</h1>
      <p className="text-sm text-zinc-400">{worker.phone} | {worker.verificationStatus}</p>

      <section className="border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="text-sm font-semibold">Recent Jobs</h2>
        <div className="mt-2 space-y-2 text-sm">
          {jobs.map((job) => (
            <div key={job.id} className="flex items-center justify-between border border-zinc-800 p-2">
              <span>{job.id}</span>
              <span>{job.status}</span>
              <span>Rs {job.amount}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
