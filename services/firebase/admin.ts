import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Timestamp,
  type QueryConstraint,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { WorkerProfile, WorkerWithdrawal, WorkerJob } from "@/services/firebase/types";

export interface PlatformStats {
  totalCustomers: number;
  totalWorkers: number;
  totalBookings: number;
  totalRevenue: number;
  pendingVerifications: number;
  activeDisputes: number;
  todayBookings: number;
  monthlyGrowth: number;
}

export interface DailyStats {
  date: string;
  newCustomers: number;
  newWorkers: number;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  commissionEarned: number;
  refundsIssued: number;
}

export interface AdminCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  totalBookings: number;
  totalSpent: number;
  createdAt?: Timestamp;
  status: "active" | "suspended";
}

export interface AdminBooking {
  id: string;
  customerId: string;
  customerName: string;
  workerId: string;
  workerName: string;
  service: string;
  scheduledTime?: Timestamp;
  amount: number;
  status: string;
  createdAt?: Timestamp;
}

export interface DisputeResolution {
  action: "full_refund" | "partial_refund" | "reject" | "compensation";
  amount?: number;
  notes: string;
}

export interface Dispute {
  id: string;
  bookingId: string;
  raisedBy: "customer" | "worker";
  raisedById: string;
  reason: "damaged_item" | "bad_work" | "theft" | "misbehavior" | "other";
  description: string;
  evidence: string[];
  amount: number;
  status: "pending" | "resolved" | "rejected";
  resolution?: {
    action: "full_refund" | "partial_refund" | "reject" | "compensation";
    amount?: number;
    notes: string;
  };
  resolvedBy?: string;
  resolvedAt?: Timestamp;
  createdAt?: Timestamp;
}

export interface WithdrawalRequest {
  id: string;
  workerId: string;
  workerName: string;
  amount: number;
  method: "bank" | "upi";
  bankDetails: {
    accountName: string;
    accountNumber: string;
    ifscCode: string;
    upiId?: string;
  };
  status: "pending" | "processing" | "completed" | "failed";
  transactionId?: string;
  notes?: string;
  processedBy?: string;
  requestedAt?: Timestamp;
  processedAt?: Timestamp;
}

export interface PlatformSettings {
  id: string;
  commissionRate: number;
  safetyShieldPrice: number;
  minimumWithdrawal: number;
  disputeWindowHours: number;
  serviceablePincodes: string[];
  serviceCategories: {
    id: string;
    name: string;
    icon: string;
    isActive: boolean;
    basePrice: number;
  }[];
  maintenanceMode: boolean;
  updatedAt?: Timestamp;
  updatedBy: string;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function asTimestamp(value: unknown): Timestamp | undefined {
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return value as Timestamp;
  }
  return undefined;
}

function startOfMonth(offsetMonths = 0): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + offsetMonths, 1);
}

async function getUserName(uid: string): Promise<string> {
  if (!uid) return "Unknown";
  const snap = await getDoc(doc(db, "users", uid));
  return String(snap.data()?.name ?? "Unknown");
}

export const checkAdminRole = async (uid: string): Promise<boolean> => {
  if (!uid) return false;
  if (!auth.currentUser || auth.currentUser.uid !== uid) return false;
  const token = await auth.currentUser.getIdTokenResult(true);
  return String(token.claims.role ?? "") === "admin";
};

export const getPlatformStats = async (): Promise<PlatformStats> => {
  const customersCount = await getCountFromServer(query(collection(db, "users"), where("role", "==", "user")));
  const workersCount = await getCountFromServer(collection(db, "providers"));
  const bookingsCount = await getCountFromServer(collection(db, "bookings"));
  const pendingVerificationsCount = await getCountFromServer(
    query(collection(db, "providers"), where("verificationStatus", "==", "pending"))
  );
  const activeDisputesCount = await getCountFromServer(
    query(collection(db, "disputes"), where("status", "==", "pending"))
  ).catch(() => ({ data: () => ({ count: 0 }) } as Awaited<ReturnType<typeof getCountFromServer>>));

  const completedBookings = await getDocs(
    query(collection(db, "bookings"), where("status", "==", "completed"), limit(1000))
  );
  const totalRevenue = completedBookings.docs.reduce((sum, item) => {
    const amount = Number(item.data().amount ?? 0);
    const commissionPercent = Number(item.data().commissionPercent ?? 10);
    return sum + amount * (commissionPercent / 100);
  }, 0);

  const today = startOfToday();
  const todayBookingsSnap = await getDocs(
    query(collection(db, "bookings"), where("createdAt", ">=", today), limit(500))
  ).catch(() => ({ size: 0 } as Awaited<ReturnType<typeof getDocs>>));

  const thisMonth = startOfMonth(0);
  const lastMonth = startOfMonth(-1);
  const nextMonth = startOfMonth(1);

  const [thisMonthBookings, lastMonthBookings] = await Promise.all([
    getCountFromServer(
      query(collection(db, "bookings"), where("createdAt", ">=", thisMonth), where("createdAt", "<", nextMonth))
    ).catch(() => ({ data: () => ({ count: 0 }) } as Awaited<ReturnType<typeof getCountFromServer>>)),
    getCountFromServer(
      query(collection(db, "bookings"), where("createdAt", ">=", lastMonth), where("createdAt", "<", thisMonth))
    ).catch(() => ({ data: () => ({ count: 0 }) } as Awaited<ReturnType<typeof getCountFromServer>>)),
  ]);

  const thisMonthCount = thisMonthBookings.data().count;
  const lastMonthCount = lastMonthBookings.data().count;
  const monthlyGrowth = lastMonthCount > 0 ? ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100 : 0;

  return {
    totalCustomers: customersCount.data().count,
    totalWorkers: workersCount.data().count,
    totalBookings: bookingsCount.data().count,
    totalRevenue: Math.round(totalRevenue),
    pendingVerifications: pendingVerificationsCount.data().count,
    activeDisputes: activeDisputesCount.data().count,
    todayBookings: todayBookingsSnap.size,
    monthlyGrowth: Number(monthlyGrowth.toFixed(1)),
  };
};

export const getDailyStats = async (days: number): Promise<DailyStats[]> => {
  const snap = await getDocs(
    query(collection(db, "dailyStats"), orderBy("date", "desc"), limit(Math.max(1, days)))
  ).catch(() => null);

  if (snap && snap.size > 0) {
    return snap.docs
      .map((item) => {
        const data = item.data();
        return {
          date: String(data.date ?? item.id),
          newCustomers: Number(data.newCustomers ?? 0),
          newWorkers: Number(data.newWorkers ?? 0),
          totalBookings: Number(data.totalBookings ?? 0),
          completedBookings: Number(data.completedBookings ?? 0),
          cancelledBookings: Number(data.cancelledBookings ?? 0),
          totalRevenue: Number(data.totalRevenue ?? 0),
          commissionEarned: Number(data.commissionEarned ?? 0),
          refundsIssued: Number(data.refundsIssued ?? 0),
        } satisfies DailyStats;
      })
      .reverse();
  }

  return [];
};

export const getPendingWorkers = async (): Promise<WorkerProfile[]> => {
  try {
    const snap = await getDocs(
      query(collection(db, "providers"), where("verificationStatus", "==", "pending"), orderBy("createdAt", "desc"))
    );
    return snap.docs.map((item) => ({ ...(item.data() as WorkerProfile), uid: item.id }));
  } catch {
    const fallbackSnap = await getDocs(
      query(collection(db, "providers"), where("verificationStatus", "==", "pending"), limit(1000))
    );
    const rows = fallbackSnap.docs.map((item) => ({ ...(item.data() as WorkerProfile), uid: item.id }));
    return rows.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.createdAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });
  }
};

export const getAllWorkers = async (): Promise<WorkerProfile[]> => {
  const snap = await getDocs(query(collection(db, "providers"), orderBy("createdAt", "desc"), limit(1000)));
  return snap.docs.map((item) => ({ ...(item.data() as WorkerProfile), uid: item.id }));
};

export const approveWorker = async (workerId: string): Promise<void> => {
  const response = await fetch(`/api/admin/providers/${workerId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "approve" }),
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || "Failed to approve worker.");
  }
};

export const rejectWorker = async (workerId: string, reason: string): Promise<void> => {
  const response = await fetch(`/api/admin/providers/${workerId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "reject", reason }),
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || "Failed to reject worker.");
  }

  await updateDoc(doc(db, "providers", workerId), {
    "verificationData.rejectedReason": reason,
    updatedAt: serverTimestamp(),
  }).catch(() => undefined);
};

export const addWorkerVerificationNotes = async (workerId: string, notes: string): Promise<void> => {
  const trimmedNotes = notes.trim();
  if (!trimmedNotes) return;

  await updateDoc(doc(db, "providers", workerId), {
    "verificationData.internalNotes": trimmedNotes,
    updatedAt: serverTimestamp(),
  });
};

export const suspendWorker = async (workerId: string): Promise<void> => {
  const response = await fetch(`/api/admin/providers/${workerId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "suspend" }),
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || "Failed to suspend worker.");
  }
};

export const getAllCustomers = async (): Promise<AdminCustomer[]> => {
  const usersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "user"), limit(1000)));
  const bookingsSnap = await getDocs(query(collection(db, "bookings"), limit(2000)));

  const spendMap = new Map<string, number>();
  const bookingCountMap = new Map<string, number>();
  bookingsSnap.docs.forEach((item) => {
    const data = item.data();
    const customerId = String(data.customerId ?? "");
    if (!customerId) return;
    bookingCountMap.set(customerId, (bookingCountMap.get(customerId) ?? 0) + 1);
    if (String(data.status ?? "") === "completed") {
      spendMap.set(customerId, (spendMap.get(customerId) ?? 0) + Number(data.amount ?? 0));
    }
  });

  return usersSnap.docs.map((item) => {
    const data = item.data();
    return {
      id: item.id,
      name: String(data.name ?? "Customer"),
      email: String(data.email ?? ""),
      phone: typeof data.phone === "string" ? data.phone : undefined,
      totalBookings: bookingCountMap.get(item.id) ?? 0,
      totalSpent: spendMap.get(item.id) ?? 0,
      createdAt: data.createdAt,
      status: data.isBlocked ? "suspended" : "active",
    };
  });
};

export const suspendCustomer = async (customerId: string): Promise<void> => {
  await updateDoc(doc(db, "users", customerId), {
    isBlocked: true,
    updatedAt: serverTimestamp(),
  });
};

export const getAllBookings = async (filters?: {
  status?: string;
  startDate?: Date;
  endDate?: Date;
  service?: string;
}): Promise<AdminBooking[]> => {
  const constraints: QueryConstraint[] = [orderBy("createdAt", "desc"), limit(1000)];
  if (filters?.status) constraints.unshift(where("status", "==", filters.status));
  if (filters?.service) constraints.unshift(where("serviceCategory", "==", filters.service));
  if (filters?.startDate) constraints.unshift(where("createdAt", ">=", filters.startDate));
  if (filters?.endDate) constraints.unshift(where("createdAt", "<=", filters.endDate));

  const bookingsSnap = await getDocs(query(collection(db, "bookings"), ...constraints));

  const ids = new Set<string>();
  bookingsSnap.docs.forEach((item) => {
    const data = item.data();
    const customerId = String(data.customerId ?? "");
    const providerId = String(data.providerId ?? "");
    if (customerId) ids.add(customerId);
    if (providerId) ids.add(providerId);
  });

  const usersMap = new Map<string, string>();
  await Promise.all(
    Array.from(ids).map(async (id) => {
      usersMap.set(id, await getUserName(id));
    })
  );

  return bookingsSnap.docs.map((item) => {
    const data = item.data();
    const customerId = String(data.customerId ?? "");
    const workerId = String(data.providerId ?? "");
    return {
      id: item.id,
      customerId,
      customerName: usersMap.get(customerId) ?? "Customer",
      workerId,
      workerName: usersMap.get(workerId) ?? "Worker",
      service: String(data.serviceCategory ?? data.service ?? "service"),
      scheduledTime: data.scheduledAt,
      amount: Number(data.amount ?? 0),
      status: String(data.status ?? "pending"),
      createdAt: data.createdAt,
    };
  });
};

export const getDisputes = async (status?: string): Promise<Dispute[]> => {
  const constraints: QueryConstraint[] = [orderBy("createdAt", "desc"), limit(1000)];
  if (status) constraints.unshift(where("status", "==", status));

  const snap = await getDocs(query(collection(db, "disputes"), ...constraints));
  return snap.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Dispute, "id">) }));
};

export const resolveDispute = async (
  disputeId: string,
  resolution: DisputeResolution
): Promise<void> => {
  const adminId = auth.currentUser?.uid ?? "admin";
  await updateDoc(doc(db, "disputes", disputeId), {
    status: resolution.action === "reject" ? "rejected" : "resolved",
    resolution,
    resolvedBy: adminId,
    resolvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const getWithdrawalRequests = async (status?: string): Promise<WithdrawalRequest[]> => {
  const constraints: QueryConstraint[] = [orderBy("requestedAt", "desc"), limit(1000)];
  if (status) constraints.unshift(where("status", "==", status));

  const snap = await getDocs(query(collection(db, "withdrawals"), ...constraints));
  return snap.docs.map((item) => {
    const data = item.data() as WorkerWithdrawal & Record<string, unknown>;
    const bankDetails = (data.bankDetails ?? {}) as Record<string, unknown>;
    return {
      id: item.id,
      workerId: String(data.workerId ?? ""),
      workerName: String(data.workerName ?? "Worker"),
      amount: Number(data.amount ?? 0),
      method: data.method === "upi" ? "upi" : "bank",
      bankDetails: {
        accountName: String(bankDetails.accountName ?? ""),
        accountNumber: String(bankDetails.accountNumber ?? ""),
        ifscCode: String(bankDetails.ifscCode ?? ""),
        upiId: typeof bankDetails.upiId === "string" ? bankDetails.upiId : undefined,
      },
      status: ["pending", "processing", "completed", "failed"].includes(String(data.status))
        ? (data.status as WithdrawalRequest["status"])
        : "pending",
      transactionId: typeof data.transactionId === "string" ? data.transactionId : undefined,
      notes: typeof data.notes === "string" ? data.notes : undefined,
      processedBy: typeof data.processedBy === "string" ? data.processedBy : undefined,
      requestedAt: asTimestamp(data.requestedAt),
      processedAt: asTimestamp(data.processedAt),
    };
  });
};

export const updateWithdrawalStatus = async (
  withdrawalId: string,
  status: string,
  transactionId?: string
): Promise<void> => {
  await updateDoc(doc(db, "withdrawals", withdrawalId), {
    status,
    transactionId: transactionId ?? null,
    processedBy: auth.currentUser?.uid ?? "admin",
    processedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const getPlatformSettings = async (): Promise<PlatformSettings> => {
  const ref = doc(db, "platformSettings", "settings");
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const fallback: PlatformSettings = {
      id: "settings",
      commissionRate: 12,
      safetyShieldPrice: 15,
      minimumWithdrawal: 500,
      disputeWindowHours: 24,
      serviceablePincodes: [],
      serviceCategories: [],
      maintenanceMode: false,
      updatedBy: "system",
    };
    await setDoc(ref, {
      ...fallback,
      updatedAt: serverTimestamp(),
    });
    return fallback;
  }
  return {
    id: snap.id,
    ...(snap.data() as Omit<PlatformSettings, "id">),
  };
};

export const updatePlatformSettings = async (
  settings: Partial<PlatformSettings>
): Promise<void> => {
  await setDoc(
    doc(db, "platformSettings", "settings"),
    {
      ...settings,
      updatedBy: auth.currentUser?.uid ?? "admin",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const getWorkerJobsForAdmin = async (workerId: string): Promise<WorkerJob[]> => {
  const snap = await getDocs(
    query(collection(db, "workerJobs"), where("workerId", "==", workerId), orderBy("createdAt", "desc"), limit(100))
  );
  return snap.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<WorkerJob, "id">) }));
};

