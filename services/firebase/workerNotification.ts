import {
  collection,
  getDocs,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { WorkerNotification } from "@/services/firebase/types";

function toWorkerNotification(
  id: string,
  data: Record<string, unknown>,
  workerId: string
): WorkerNotification {
  const type = String(data.type ?? "system");
  return {
    id,
    workerId,
    type:
      type === "new_job" ||
      type === "job_accepted" ||
      type === "job_completed" ||
      type === "payment_released" ||
      type === "verification_status"
        ? type
        : "system",
    title: String(data.title ?? ""),
    message: String(data.message ?? ""),
    read: data.read === true,
    bookingId: typeof data.bookingId === "string" ? data.bookingId : undefined,
    jobId: typeof data.jobId === "string" ? data.jobId : undefined,
    createdAt: data.createdAt as WorkerNotification["createdAt"],
    metadata: data.metadata as WorkerNotification["metadata"],
  };
}

export const subscribeToWorkerNotifications = (
  workerId: string,
  callback: (notification: WorkerNotification) => void
): (() => void) => {
  const q = query(
    collection(db, "notifications"),
    where("recipientId", "==", workerId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "removed") return;
      callback(
        toWorkerNotification(
          change.doc.id,
          change.doc.data() as Record<string, unknown>,
          workerId
        )
      );
    });
  });
};

export const getWorkerNotifications = async (
  workerId: string
): Promise<WorkerNotification[]> => {
  const snap = await getDocs(
    query(
      collection(db, "notifications"),
      where("recipientId", "==", workerId),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map((entry) =>
    toWorkerNotification(entry.id, entry.data() as Record<string, unknown>, workerId)
  );
};

export const markNotificationRead = async (notificationId: string): Promise<void> => {
  await updateDoc(doc(db, "notifications", notificationId), {
    read: true,
    readAt: serverTimestamp(),
  });
};
