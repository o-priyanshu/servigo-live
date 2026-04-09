import {
  collection,
  type DocumentData,
  doc,
  getDocs,
  limit as firestoreLimit,
  onSnapshot,
  query,
  type QuerySnapshot,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Notification } from "@/services/firebase/types";
import { asString, toIsoString } from "@/services/firebase/utils";

function toNotification(id: string, data: Record<string, unknown>): Notification {
  return {
    id,
    customerId: asString(data.customerId ?? data.recipientId, ""),
    type:
      data.type === "promotion" || data.type === "safety" || data.type === "system"
        ? data.type
        : "booking_update",
    title: asString(data.title, ""),
    message: asString(data.message, ""),
    read: data.read === true,
    bookingId: typeof data.bookingId === "string" ? data.bookingId : undefined,
    createdAt: toIsoString(data.createdAt),
    metadata:
      data.metadata && typeof data.metadata === "object"
        ? (data.metadata as Record<string, unknown>)
        : undefined,
  };
}

export const getNotifications = async (customerId: string): Promise<Notification[]> => {
  const notificationsRef = collection(db, "notifications");
  const [byCustomerId, byRecipientId] = await Promise.all([
    getDocs(query(notificationsRef, where("customerId", "==", customerId), firestoreLimit(200))),
    getDocs(query(notificationsRef, where("recipientId", "==", customerId), firestoreLimit(200))),
  ]);

  const mergedById = new Map<string, Notification>();
  [...byCustomerId.docs, ...byRecipientId.docs].forEach((entry) => {
    mergedById.set(entry.id, toNotification(entry.id, entry.data() as Record<string, unknown>));
  });
  const rows = Array.from(mergedById.values());
  rows.sort((a, b) => {
    const ta = new Date(a.createdAt ?? 0).getTime();
    const tb = new Date(b.createdAt ?? 0).getTime();
    if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
    return tb - ta;
  });
  return rows;
};

export const markNotificationRead = async (notificationId: string): Promise<void> => {
  await updateDoc(doc(db, "notifications", notificationId), {
    read: true,
    readAt: serverTimestamp(),
  });
};

export const subscribeToNotifications = (
  customerId: string,
  callback: (notification: Notification) => void
): (() => void) => {
  const notificationsRef = collection(db, "notifications");
  const customerQuery = query(
    notificationsRef,
    where("customerId", "==", customerId),
    firestoreLimit(200)
  );
  const recipientQuery = query(
    notificationsRef,
    where("recipientId", "==", customerId),
    firestoreLimit(200)
  );

  const emitChanges = (snapshot: QuerySnapshot<DocumentData>) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "removed") return;
      callback(toNotification(change.doc.id, change.doc.data() as Record<string, unknown>));
    });
  };

  const unsubA = onSnapshot(customerQuery, emitChanges);
  const unsubB = onSnapshot(recipientQuery, emitChanges);
  return () => {
    unsubA();
    unsubB();
  };
};
