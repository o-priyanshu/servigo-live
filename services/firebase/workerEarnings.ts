import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { WorkerEarning, WorkerWithdrawal } from "@/services/firebase/types";

function toWorkerEarning(entry: QueryDocumentSnapshot<DocumentData>): WorkerEarning {
  const data = entry.data();
  return {
    id: entry.id,
    workerId: String(data.workerId ?? ""),
    jobId: String(data.jobId ?? ""),
    amount: Number(data.amount ?? 0),
    commission: Number(data.commission ?? 0),
    net: Number(data.net ?? 0),
    status: data.status ?? "held",
    releasedAt: data.releasedAt,
    createdAt: data.createdAt,
  } as WorkerEarning;
}

function toWorkerWithdrawal(entry: QueryDocumentSnapshot<DocumentData>): WorkerWithdrawal {
  const data = entry.data();
  return {
    id: entry.id,
    workerId: String(data.workerId ?? ""),
    amount: Number(data.amount ?? 0),
    method: data.method === "upi" ? "upi" : "bank",
    status: data.status ?? "pending",
    transactionId: typeof data.transactionId === "string" ? data.transactionId : undefined,
    requestedAt: data.requestedAt,
    completedAt: data.completedAt,
  } as WorkerWithdrawal;
}

export const getWorkerEarnings = async (
  workerId: string,
  period?: "today" | "week" | "month"
): Promise<WorkerEarning[]> => {
  const snap = await getDocs(
    query(
      collection(db, "workerEarnings"),
      where("workerId", "==", workerId),
      orderBy("createdAt", "desc")
    )
  );

  const rows = snap.docs.map(toWorkerEarning);
  if (!period) return rows;

  const now = new Date();
  const from = new Date(now);
  if (period === "today") {
    from.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    from.setDate(now.getDate() - 7);
  } else {
    from.setMonth(now.getMonth() - 1);
  }

  return rows.filter((row) => (row.createdAt?.toMillis?.() ?? 0) >= from.getTime());
};

export const getEarningsBreakdown = async (workerId: string) => {
  const rows = await getWorkerEarnings(workerId);
  const totals = rows.reduce(
    (acc, item) => {
      acc.gross += item.amount;
      acc.commission += item.commission;
      acc.net += item.net;
      if (item.status === "released") acc.released += item.net;
      if (item.status === "held") acc.held += item.net;
      return acc;
    },
    { gross: 0, commission: 0, net: 0, released: 0, held: 0 }
  );
  return { totals, items: rows };
};

export const requestWithdrawal = async (
  workerId: string,
  amount: number,
  method: string
): Promise<void> => {
  if (!Number.isFinite(amount) || amount < 500) {
    throw new Error("Minimum withdrawal is 500.");
  }
  if (method !== "bank" && method !== "upi") {
    throw new Error("Withdrawal method must be bank or upi.");
  }

  const { totals } = await getEarningsBreakdown(workerId);
  const history = await getWithdrawalHistory(workerId);
  const withdrawn = history
    .filter((item) => item.status === "completed" || item.status === "processing" || item.status === "pending")
    .reduce((sum, item) => sum + item.amount, 0);
  const availableBalance = totals.released - withdrawn;

  if (amount > availableBalance) {
    throw new Error("Requested amount exceeds available balance.");
  }

  await addDoc(collection(db, "withdrawals"), {
    workerId,
    amount,
    method,
    status: "pending",
    requestedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const getWithdrawalHistory = async (workerId: string): Promise<WorkerWithdrawal[]> => {
  const [primary, legacy] = await Promise.all([
    getDocs(
      query(
        collection(db, "withdrawals"),
        where("workerId", "==", workerId),
        orderBy("requestedAt", "desc")
      )
    ),
    getDocs(
      query(
        collection(db, "withdrawalRequests"),
        where("workerId", "==", workerId),
        orderBy("requestedAt", "desc")
      )
    ).catch(() => null),
  ]);

  const merged = [
    ...primary.docs.map(toWorkerWithdrawal),
    ...(legacy ? legacy.docs.map(toWorkerWithdrawal) : []),
  ];

  merged.sort(
    (a, b) =>
      (b.requestedAt?.toMillis?.() ?? 0) - (a.requestedAt?.toMillis?.() ?? 0)
  );
  return merged;
};
