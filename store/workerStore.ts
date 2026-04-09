"use client";

import { signOut } from "firebase/auth";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { auth } from "@/lib/firebase";
import { updateWorkerAvailability } from "@/services/firebase/worker";
import { checkInAtHub, getWorkerHub } from "@/services/firebase/workerHub";
import {
  getEarningsBreakdown,
  getWithdrawalHistory,
  getWorkerEarnings,
  requestWithdrawal as requestWithdrawalService,
} from "@/services/firebase/workerEarnings";
import {
  acceptJob as acceptJobService,
  declineJob as declineJobService,
  getActiveJobs,
  getPendingJobs,
  subscribeToPendingJobs as subscribeToPendingJobsService,
  updateJobStatus as updateJobStatusService,
  uploadJobPhoto,
} from "@/services/firebase/workerJobs";
import {
  getWorkerNotifications,
  markNotificationRead as markNotificationReadService,
  subscribeToWorkerNotifications,
} from "@/services/firebase/workerNotification";
import { updateWorkerLocation } from "@/services/firebase/workerLocation";
import type {
  JobRequest,
  WorkerEarning,
  WorkerJob,
  WorkerJobStatus,
  WorkerNotification,
  WorkerProfile,
  WorkerRegistrationData,
  WorkerWithdrawal,
} from "@/services/firebase/types";

const defaultRegistrationData: Partial<WorkerRegistrationData> = {
  serviceRadius: 6,
  serviceablePincodes: [],
  skills: [],
  languages: [],
  tools: [],
};

let pendingJobsUnsubscribe: (() => void) | null = null;
let notificationsUnsubscribe: (() => void) | null = null;

interface WorkerStore {
  worker: WorkerProfile | null;
  isAvailable: boolean;
  pendingJobs: JobRequest[];
  activeJobs: WorkerJob[];
  earnings: WorkerEarning[];
  withdrawals: WorkerWithdrawal[];
  notifications: WorkerNotification[];
  availableBalance: number;
  isLoading: boolean;
  error: string | null;

  registrationData: Partial<WorkerRegistrationData>;
  registrationStep: number;

  setRegistrationData: (data: Partial<WorkerRegistrationData>) => void;
  setRegistrationStep: (step: number) => void;

  setWorker: (worker: WorkerProfile) => void;
  setAvailability: (available: boolean) => Promise<void>;
  fetchPendingJobs: () => Promise<void>;
  subscribeToPendingJobs: () => () => void;
  acceptJob: (jobId: string) => Promise<void>;
  declineJob: (jobId: string) => Promise<void>;
  updateJobStatus: (
    jobId: string,
    status: WorkerJobStatus,
    data?: Record<string, unknown>
  ) => Promise<void>;
  fetchActiveJobs: () => Promise<void>;
  fetchEarnings: () => Promise<void>;
  requestWithdrawal: (amount: number, method: string) => Promise<void>;
  fetchWithdrawalHistory: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  subscribeToNotifications: () => () => void;
  updateLocation: (lat: number, lng: number) => Promise<void>;
  uploadEntryPhoto: (jobId: string, file: File) => Promise<string>;
  uploadExitPhoto: (jobId: string, file: File) => Promise<string>;
  checkInAtHub: () => Promise<void>;
  logout: () => void;
}

function resolveWorkerId(state: WorkerStore): string {
  const uid = state.worker?.uid ?? auth.currentUser?.uid;
  if (!uid) throw new Error("Worker not authenticated.");
  return uid;
}

export const useWorkerStore = create<WorkerStore>()(
  persist(
    (set, get) => ({
      worker: null,
      isAvailable: false,
      pendingJobs: [],
      activeJobs: [],
      earnings: [],
      withdrawals: [],
      notifications: [],
      availableBalance: 0,
      isLoading: false,
      error: null,
      registrationData: defaultRegistrationData,
      registrationStep: 1,

      setRegistrationData: (data) =>
        set((state) => ({
          registrationData: { ...state.registrationData, ...data },
        })),
      setRegistrationStep: (step) => set({ registrationStep: step }),

      setWorker: (worker) => set({ worker, isAvailable: worker.isAvailable }),

      setAvailability: async (available) => {
        try {
          const workerId = resolveWorkerId(get());
          set({ isAvailable: available, error: null });
          await updateWorkerAvailability(workerId, available);
        } catch (error) {
          set({
            isAvailable: get().worker?.isAvailable ?? false,
            error: error instanceof Error ? error.message : "Failed to update availability.",
          });
          throw error;
        }
      },

      fetchPendingJobs: async () => {
        try {
          const state = get();
          const workerId = resolveWorkerId(state);
          const rows = await getPendingJobs(
            workerId,
            state.worker?.address.lat,
            state.worker?.address.lng,
            state.worker?.serviceRadius
          );
          set({ pendingJobs: rows, error: null });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Failed to fetch pending jobs." });
        }
      },

      subscribeToPendingJobs: () => {
        if (pendingJobsUnsubscribe) pendingJobsUnsubscribe();

        const state = get();
        const workerId = resolveWorkerId(state);
        const lat = state.worker?.address.lat ?? 0;
        const lng = state.worker?.address.lng ?? 0;
        const radius = state.worker?.serviceRadius ?? 10;

        pendingJobsUnsubscribe = subscribeToPendingJobsService(workerId, lat, lng, radius, (jobs) => {
          set({ pendingJobs: jobs });
        });

        return () => {
          pendingJobsUnsubscribe?.();
          pendingJobsUnsubscribe = null;
        };
      },

	      acceptJob: async (jobId) => {
	        try {
	          const workerId = resolveWorkerId(get());
	          await acceptJobService(jobId, workerId);
	          await Promise.all([get().fetchPendingJobs(), get().fetchActiveJobs()]);
	          set({ error: null });
	        } catch (error) {
	          const message =
	            error instanceof Error ? error.message : "Failed to accept job.";
	          set({ error: message });
	          throw error;
	        }
	      },

      declineJob: async (jobId) => {
        const workerId = resolveWorkerId(get());
        await declineJobService(jobId, workerId);
        await get().fetchPendingJobs();
      },

	      updateJobStatus: async (jobId, status, data) => {
	        await updateJobStatusService(jobId, status, data);
	        await Promise.all([
	          get().fetchActiveJobs(),
	          get().fetchPendingJobs(),
	          get().fetchEarnings(),
	        ]);
	      },

      fetchActiveJobs: async () => {
        try {
          const workerId = resolveWorkerId(get());
          const jobs = await getActiveJobs(workerId);
          set({ activeJobs: jobs, error: null });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Failed to fetch active jobs." });
        }
      },

      fetchEarnings: async () => {
        try {
          const workerId = resolveWorkerId(get());
          const [rows, breakdown] = await Promise.all([
            getWorkerEarnings(workerId),
            getEarningsBreakdown(workerId),
          ]);
          set({
            earnings: rows,
            availableBalance: Math.max(0, breakdown.totals.released),
            error: null,
          });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Failed to fetch earnings." });
        }
      },

      requestWithdrawal: async (amount, method) => {
        const workerId = resolveWorkerId(get());
        await requestWithdrawalService(workerId, amount, method);
        await get().fetchWithdrawalHistory();
      },

      fetchWithdrawalHistory: async () => {
        try {
          const workerId = resolveWorkerId(get());
          const rows = await getWithdrawalHistory(workerId);
          set({ withdrawals: rows, error: null });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Failed to fetch withdrawals." });
        }
      },

      fetchNotifications: async () => {
        try {
          const workerId = resolveWorkerId(get());
          const rows = await getWorkerNotifications(workerId);
          set({ notifications: rows, error: null });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Failed to fetch notifications." });
        }
      },

      markNotificationRead: async (notificationId) => {
        set((state) => ({
          notifications: state.notifications.map((item) =>
            item.id === notificationId ? { ...item, read: true } : item
          ),
        }));

        try {
          await markNotificationReadService(notificationId);
        } catch (error) {
          set((state) => ({
            notifications: state.notifications.map((item) =>
              item.id === notificationId ? { ...item, read: false } : item
            ),
            error: error instanceof Error ? error.message : "Failed to update notification.",
          }));
        }
      },

      subscribeToNotifications: () => {
        if (notificationsUnsubscribe) notificationsUnsubscribe();

        const workerId = resolveWorkerId(get());
        notificationsUnsubscribe = subscribeToWorkerNotifications(workerId, (notification) => {
          set((state) => {
            const existing = state.notifications.find((item) => item.id === notification.id);
            if (existing) {
              return {
                notifications: state.notifications.map((item) =>
                  item.id === notification.id ? notification : item
                ),
              };
            }
            return { notifications: [notification, ...state.notifications] };
          });
        });

        return () => {
          notificationsUnsubscribe?.();
          notificationsUnsubscribe = null;
        };
      },

      updateLocation: async (lat, lng) => {
        const workerId = resolveWorkerId(get());
        await updateWorkerLocation(workerId, lat, lng);
      },

      uploadEntryPhoto: async (jobId, file) => uploadJobPhoto(jobId, "entry", file),

      uploadExitPhoto: async (jobId, file) => uploadJobPhoto(jobId, "exit", file),

      checkInAtHub: async () => {
        const workerId = resolveWorkerId(get());
        const { hubId } = await getWorkerHub(workerId);
        if (!hubId) throw new Error("No hub is assigned to this worker.");
        await checkInAtHub(workerId, hubId);
      },

      logout: () => {
        pendingJobsUnsubscribe?.();
        notificationsUnsubscribe?.();
        pendingJobsUnsubscribe = null;
        notificationsUnsubscribe = null;

        void signOut(auth);
        set({
          worker: null,
          isAvailable: false,
          pendingJobs: [],
          activeJobs: [],
          earnings: [],
          withdrawals: [],
          notifications: [],
          availableBalance: 0,
          registrationData: defaultRegistrationData,
          registrationStep: 1,
          error: null,
        });
      },
    }),
    {
      name: "servigo:worker-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        worker: state.worker,
        isAvailable: state.isAvailable,
        registrationData: state.registrationData,
        registrationStep: state.registrationStep,
      }),
    }
  )
);

