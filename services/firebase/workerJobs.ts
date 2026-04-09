import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { uploadFileToCloudinary } from "@/lib/cloudinary-upload";
import { db } from "@/lib/firebase";
import { haversineKm } from "@/services/firebase/utils";
import type { JobRequest, WorkerJob, WorkerJobStatus } from "@/services/firebase/types";

function toEpochMillis(value: unknown): number {
  if (!value) return Number.NaN;
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const ts = new Date(value).getTime();
    return Number.isFinite(ts) ? ts : Number.NaN;
  }
  if (typeof value === "object" && value !== null && "toMillis" in value) {
    const maybe = value as { toMillis?: () => number };
    if (typeof maybe.toMillis === "function") return maybe.toMillis();
  }
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const maybe = value as { toDate?: () => Date };
    if (typeof maybe.toDate === "function") return maybe.toDate().getTime();
  }
  return Number.NaN;
}

function toJobRequest(entry: QueryDocumentSnapshot<DocumentData>): JobRequest {
  const data = entry.data();
  return {
    id: entry.id,
    workerId: String(data.workerId ?? ""),
    bookingId: String(data.bookingId ?? ""),
    customerId: String(data.customerId ?? ""),
    customerName: String(data.customerName ?? "Customer"),
    customerPhone: String(data.customerPhone ?? ""),
    customerAddress: data.customerAddress,
    customerRating: Number(data.customerRating ?? 0),
    service: String(data.service ?? ""),
    description: String(data.description ?? ""),
    photos: Array.isArray(data.photos) ? data.photos.map(String) : [],
    scheduledTime: data.scheduledTime,
    estimatedPrice: Number(data.estimatedPrice ?? 0),
    distance: Number(data.distance ?? 0),
    status: data.status ?? "pending",
    expiresAt: data.expiresAt,
    createdAt: data.createdAt,
  } as unknown as JobRequest;
}

function toJobRequestFromBooking(entry: QueryDocumentSnapshot<DocumentData>): JobRequest {
  const data = entry.data();
  const addressText = String(data.address ?? "");
  const pincodeMatch = addressText.match(/\b(\d{6})\b/);
  const pincode = pincodeMatch ? pincodeMatch[1] : "";
  const scheduledAtRaw = String(data.scheduledAt ?? "");
  const parsedScheduledAt = new Date(scheduledAtRaw);
  const schedule =
    Number.isFinite(parsedScheduledAt.getTime())
      ? parsedScheduledAt
      : new Date(Date.now() + 30 * 60 * 1000);
  const customerAddress = {
    fullAddress: addressText,
    pincode,
  } as unknown as JobRequest["customerAddress"];
  return {
    id: entry.id,
    workerId: String(data.providerId ?? ""),
    bookingId: entry.id,
    customerId: String(data.customerId ?? ""),
    customerName: String(data.customerName ?? "Customer"),
    customerPhone: String(data.customerPhone ?? ""),
    customerAddress,
    customerRating: 0,
    service: String(data.serviceCategory ?? ""),
    description: "",
    photos: Array.isArray(data.jobPhotos) ? data.jobPhotos.map(String) : [],
    scheduledTime: schedule,
    estimatedPrice: Number(data.amount ?? 0),
    distance: 0,
    status: "pending",
    expiresAt: schedule,
    createdAt: data.createdAt,
  } as unknown as JobRequest;
}

function toWorkerJobData(id: string, data: Record<string, unknown>): WorkerJob {
  const price = (data.price ?? {}) as Record<string, unknown>;
  return {
    id,
    bookingId: String(data.bookingId ?? ""),
    workerId: String(data.workerId ?? ""),
    customerId: String(data.customerId ?? ""),
    customerName: String(data.customerName ?? "Customer"),
    customerPhone: String(data.customerPhone ?? ""),
    customerAddress: data.customerAddress,
    service: String(data.service ?? ""),
    description: String(data.description ?? ""),
    photos: Array.isArray(data.photos) ? data.photos.map(String) : [],
    scheduledTime: data.scheduledTime,
    actualStartTime: data.actualStartTime,
    actualEndTime: data.actualEndTime,
    status: data.status ?? "accepted",
    price: {
      base: Number(price.base ?? 0),
      commission: Number(price.commission ?? 0),
      net: Number(price.net ?? 0),
    },
    paymentStatus: data.paymentStatus ?? "held",
    statusHistory: Array.isArray(data.statusHistory)
      ? data.statusHistory
          .map((item) => {
            const row = item as Record<string, unknown>;
            const status = row.status;
            const at = row.at;
            if (
              (status === "accepted" ||
                status === "on_way" ||
                status === "arrived" ||
                status === "working" ||
                status === "completed" ||
                status === "cancelled") &&
              at
            ) {
              return { status, at };
            }
            return null;
          })
          .filter(Boolean) as WorkerJob["statusHistory"]
      : undefined,
    entryPhoto: typeof data.entryPhoto === "string" ? data.entryPhoto : undefined,
    exitPhoto: typeof data.exitPhoto === "string" ? data.exitPhoto : undefined,
    notes: typeof data.notes === "string" ? data.notes : undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  } as WorkerJob;
}

function toWorkerJob(entry: QueryDocumentSnapshot<DocumentData>): WorkerJob {
  return toWorkerJobData(entry.id, entry.data() as Record<string, unknown>);
}

function toJobRequestFromApi(data: Record<string, unknown>): JobRequest {
  return {
    id: String(data.id ?? ""),
    workerId: String(data.workerId ?? ""),
    bookingId: String(data.bookingId ?? ""),
    customerId: String(data.customerId ?? ""),
    customerName: String(data.customerName ?? "Customer"),
    customerPhone: String(data.customerPhone ?? ""),
    customerAddress: (data.customerAddress ?? {}) as JobRequest["customerAddress"],
    customerRating: Number(data.customerRating ?? 0),
    service: String(data.service ?? ""),
    description: String(data.description ?? ""),
    photos: Array.isArray(data.photos) ? data.photos.map(String) : [],
    scheduledTime: data.scheduledTime ?? new Date().toISOString(),
    estimatedPrice: Number(data.estimatedPrice ?? 0),
    distance: Number(data.distance ?? 0),
    status: "pending",
    expiresAt: data.expiresAt ?? data.scheduledTime ?? null,
    createdAt: data.createdAt ?? null,
  } as JobRequest;
}

async function getPendingJobsFromApi(workerId: string): Promise<JobRequest[] | null> {
  try {
    const res = await fetch("/api/provider/job-requests", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => ({}))) as { pendingJobs?: unknown };
    if (!Array.isArray(data.pendingJobs)) return [];
    return data.pendingJobs
      .map((item) =>
        item && typeof item === "object"
          ? toJobRequestFromApi(item as Record<string, unknown>)
          : null
      )
      .filter((item): item is JobRequest => item !== null && item.workerId === workerId);
  } catch {
    return null;
  }
}

export const subscribeToPendingJobs = (
  workerId: string,
  lat: number,
  lng: number,
  radius: number,
  callback: (jobs: JobRequest[]) => void
): (() => void) => {
  let cancelled = false;
  const run = async () => {
    try {
      const rows = await getPendingJobs(workerId, lat, lng, radius);
      if (!cancelled) callback(rows);
    } catch {
      if (!cancelled) callback([]);
    }
  };
  void run();
  const timer = window.setInterval(() => {
    void run();
  }, 8000);
  return () => {
    cancelled = true;
    window.clearInterval(timer);
  };
};

export const getPendingJobs = async (
  workerId: string,
  lat?: number,
  lng?: number,
  radius?: number
): Promise<JobRequest[]> => {
  const apiRows = await getPendingJobsFromApi(workerId);
  if (apiRows) {
    const now = Date.now();
    const validApiRows = apiRows.filter((row) => {
      const expiresAtMillis = toEpochMillis(row.expiresAt);
      if (!Number.isFinite(expiresAtMillis)) return true;
      return expiresAtMillis > now;
    });
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      typeof radius !== "number"
    ) {
      return validApiRows;
    }
    return validApiRows.filter((row) => {
      const addr = row.customerAddress;
      if (!addr || typeof addr.lat !== "number" || typeof addr.lng !== "number") return true;
      return haversineKm(lat, lng, addr.lat, addr.lng) <= radius;
    });
  }

  const requestsSnap = await getDocs(
    query(
      collection(db, "jobRequests"),
      where("workerId", "==", workerId),
      where("status", "==", "pending"),
      firestoreLimit(50)
    )
  );
  const rows = requestsSnap.docs
    .map(toJobRequest)
    .sort((a, b) => (toEpochMillis(b.createdAt) || 0) - (toEpochMillis(a.createdAt) || 0));
  const requestBookingIds = new Set(rows.map((item) => item.bookingId));

  const bookingsSnap = await getDocs(
    query(
      collection(db, "bookings"),
      where("providerId", "==", workerId),
      where("status", "==", "pending"),
      firestoreLimit(50)
    )
  );
  const fallbackRows = bookingsSnap.docs
    .filter((entry) => !requestBookingIds.has(entry.id))
    .map(toJobRequestFromBooking);

  const mergedRows = [...rows, ...fallbackRows].sort(
    (a, b) => (toEpochMillis(b.createdAt) || 0) - (toEpochMillis(a.createdAt) || 0)
  );
  const now = Date.now();
  const expired = rows.filter((row) => {
    const expiresAtMillis = toEpochMillis(row.expiresAt);
    return Number.isFinite(expiresAtMillis) && expiresAtMillis <= now;
  });
  if (expired.length) {
    await Promise.all(expired.map((row) => expireJobRequest(row.id, workerId)));
  }
  const validRows = mergedRows.filter((row) => {
    const expiresAtMillis = toEpochMillis(row.expiresAt);
    if (!Number.isFinite(expiresAtMillis)) return true;
    return expiresAtMillis > now;
  });
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    typeof radius !== "number"
  ) {
    return validRows;
  }
  return validRows.filter((row) => {
    const addr = row.customerAddress;
    if (!addr || typeof addr.lat !== "number" || typeof addr.lng !== "number") return true;
    return haversineKm(lat, lng, addr.lat, addr.lng) <= radius;
  });
};

export const acceptJob = async (jobId: string, workerId: string): Promise<void> => {
  try {
    const res = await fetch(`/api/provider/job-requests/${encodeURIComponent(jobId)}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) return;
  } catch {
    // Fall back to client transaction path below.
  }

  await runTransaction(db, async (tx) => {
    const reqRef = doc(db, "jobRequests", jobId);
    const reqSnap = await tx.get(reqRef);
    if (!reqSnap.exists()) {
      const bookingRef = doc(db, "bookings", jobId);
      const bookingSnap = await tx.get(bookingRef);
      if (!bookingSnap.exists()) throw new Error("Job request not found.");
      const bookingData = bookingSnap.data();
      if (String(bookingData.providerId ?? "") !== workerId) {
        throw new Error("You are not allowed to accept this job.");
      }
      if (String(bookingData.status ?? "") !== "pending") {
        throw new Error("Booking is no longer pending.");
      }

      const jobRef = doc(collection(db, "workerJobs"));
      const estimatedPrice = Number(bookingData.amount ?? 0);
      const commission = Math.round(estimatedPrice * 0.1);
      const net = estimatedPrice - commission;

      tx.set(jobRef, {
        bookingId: bookingRef.id,
        workerId,
        customerId: bookingData.customerId ?? "",
        customerName: bookingData.customerName ?? "Customer",
        customerPhone: bookingData.customerPhone ?? "",
        customerAddress: {
          fullAddress: bookingData.address ?? "",
          pincode: "",
        },
        service: bookingData.serviceCategory ?? "",
        description: "",
        photos: Array.isArray(bookingData.jobPhotos) ? bookingData.jobPhotos : [],
        scheduledTime: Number.isFinite(new Date(String(bookingData.scheduledAt ?? "")).getTime())
          ? new Date(String(bookingData.scheduledAt ?? ""))
          : serverTimestamp(),
        status: "accepted",
        price: { base: estimatedPrice, commission, net },
        paymentStatus: "held",
        statusHistory: [{ status: "accepted", at: new Date() }],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      tx.update(bookingRef, {
        status: "confirmed",
        workerId,
        workerJobId: jobRef.id,
        updatedAt: serverTimestamp(),
      });
      return;
    }
    const requestData = reqSnap.data();

    if (requestData.workerId !== workerId) {
      throw new Error("You are not allowed to accept this job.");
    }
    if (requestData.status !== "pending") {
      throw new Error("Job request is no longer pending.");
    }

    const jobRef = doc(collection(db, "workerJobs"));
    const estimatedPrice = Number(requestData.estimatedPrice ?? 0);
    const commission = Math.round(estimatedPrice * 0.1);
    const net = estimatedPrice - commission;

    tx.update(reqRef, {
      status: "accepted",
      acceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    tx.set(jobRef, {
      bookingId: requestData.bookingId ?? "",
      workerId,
      customerId: requestData.customerId ?? "",
      customerName: requestData.customerName ?? "Customer",
      customerPhone: requestData.customerPhone ?? "",
      customerAddress: requestData.customerAddress ?? {},
      service: requestData.service ?? "",
      description: requestData.description ?? "",
      photos: Array.isArray(requestData.photos) ? requestData.photos : [],
      scheduledTime: requestData.scheduledTime ?? serverTimestamp(),
      status: "accepted",
      price: { base: estimatedPrice, commission, net },
      paymentStatus: "held",
      statusHistory: [{ status: "accepted", at: new Date() }],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (requestData.bookingId) {
      tx.update(doc(db, "bookings", requestData.bookingId), {
        status: "confirmed",
        workerId,
        workerJobId: jobRef.id,
        updatedAt: serverTimestamp(),
      });
    }
  });
};

export const declineJob = async (jobId: string, workerId: string): Promise<void> => {
  try {
    const res = await fetch(`/api/provider/job-requests/${encodeURIComponent(jobId)}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) return;
  } catch {
    // Fall back to client path below.
  }

  const reqRef = doc(db, "jobRequests", jobId);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) {
    const bookingRef = doc(db, "bookings", jobId);
    const bookingSnap = await getDoc(bookingRef);
    if (!bookingSnap.exists()) throw new Error("Job request not found.");
    const booking = bookingSnap.data() as Record<string, unknown>;
    if (String(booking.providerId ?? "") !== workerId) {
      throw new Error("You are not allowed to decline this job.");
    }
    if (String(booking.status ?? "") !== "pending") return;
    await updateDoc(bookingRef, {
      status: "cancelled",
      cancelledBy: "provider",
      cancelledAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return;
  }
  const current = reqSnap.data();
  if (current.workerId !== workerId) {
    throw new Error("You are not allowed to decline this job.");
  }

  await updateDoc(reqRef, {
    status: "declined",
    declinedBy: workerId,
    declinedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const expireJobRequest = async (
  jobId: string,
  workerId: string
): Promise<void> => {
  const reqRef = doc(db, "jobRequests", jobId);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) return;
  const current = reqSnap.data();

  if (current.workerId !== workerId) {
    throw new Error("You are not allowed to expire this job.");
  }
  if (current.status !== "pending") return;

  await updateDoc(reqRef, {
    status: "expired",
    expiredAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateJobStatus = async (
  jobId: string,
  status: WorkerJobStatus,
  data?: Record<string, unknown>
): Promise<void> => {
  const updatePayload: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp(),
    statusHistory: arrayUnion({ status, at: new Date() }),
    ...(data ?? {}),
  };

  if (status === "working") {
    updatePayload.actualStartTime = serverTimestamp();
  }
  if (status === "completed") {
    updatePayload.actualEndTime = serverTimestamp();
    updatePayload.paymentStatus = "released";
  }

  const jobRef = doc(db, "workerJobs", jobId);
  await updateDoc(jobRef, updatePayload);

  if (status === "completed" && typeof data?.bookingId === "string") {
    const [jobSnap, existingEarningSnap] = await Promise.all([
      getDoc(jobRef),
      getDocs(
        query(collection(db, "workerEarnings"), where("jobId", "==", jobId), firestoreLimit(1))
      ).catch(() => null),
    ]);

    await updateDoc(doc(db, "bookings", data.bookingId), {
      status: "completed",
      paymentStatus: "captured",
      updatedAt: serverTimestamp(),
    });

    const jobData = jobSnap.data();
    const workerId =
      typeof data?.workerId === "string"
        ? data.workerId
        : String(jobData?.workerId ?? "");
    const net = Number(jobData?.price?.net ?? 0);
    const amount = Number(jobData?.price?.base ?? 0);
    const commission = Number(jobData?.price?.commission ?? 0);

    if (
      workerId &&
      amount >= 0 &&
      commission >= 0 &&
      net >= 0 &&
      (!existingEarningSnap || existingEarningSnap.empty)
    ) {
      await addDoc(collection(db, "workerEarnings"), {
        workerId,
        jobId,
        amount,
        commission,
        net,
        status: "released",
        releasedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
    }
  }
};

export const getActiveJobs = async (workerId: string): Promise<WorkerJob[]> => {
  const activeStatuses: WorkerJobStatus[] = ["accepted", "on_way", "arrived", "working"];
  const snapshots = await Promise.all(
    activeStatuses.map((status) =>
      getDocs(
        query(
          collection(db, "workerJobs"),
          where("workerId", "==", workerId),
          where("status", "==", status),
          orderBy("scheduledTime", "desc"),
          firestoreLimit(50)
        )
      )
    )
  );

  const rows = snapshots.flatMap((snap) => snap.docs.map(toWorkerJob));
  rows.sort(
    (a, b) => (toEpochMillis(b.scheduledTime) || 0) - (toEpochMillis(a.scheduledTime) || 0)
  );
  return rows;
};

export const getJobHistory = async (
  workerId: string,
  historyLimit = 20
): Promise<WorkerJob[]> => {
  const snap = await getDocs(
    query(
      collection(db, "workerJobs"),
      where("workerId", "==", workerId),
      orderBy("scheduledTime", "desc"),
      firestoreLimit(historyLimit)
    )
  );
  return snap.docs.map(toWorkerJob);
};

export const uploadJobPhoto = async (
  jobId: string,
  type: "entry" | "exit",
  file: File
): Promise<string> => {
  if (!jobId) throw new Error("Job id is required.");
  if (!(file instanceof File)) throw new Error("Valid photo file is required.");
  const url = await uploadFileToCloudinary(file, {
    folder: `workerJobs/${jobId}`,
    publicIdPrefix: type,
  });

  await updateDoc(doc(db, "workerJobs", jobId), {
    ...(type === "entry" ? { entryPhoto: url } : { exitPhoto: url }),
    updatedAt: serverTimestamp(),
  });

  return url;
};

export const getJobDetails = async (jobId: string): Promise<WorkerJob | null> => {
  const snap = await getDoc(doc(db, "workerJobs", jobId));
  if (!snap.exists()) return null;
  return toWorkerJobData(snap.id, snap.data() as Record<string, unknown>);
};
