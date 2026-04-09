"use client";

import { create } from "zustand";
import type { WorkerProfile } from "@/services/firebase/types";
import {
  addWorkerVerificationNotes,
  approveWorker,
  getAllBookings,
  getAllCustomers,
  getAllWorkers,
  getDisputes,
  getPendingWorkers,
  getPlatformSettings,
  getPlatformStats,
  getWithdrawalRequests,
  rejectWorker,
  resolveDispute,
  suspendCustomer,
  suspendWorker,
  updatePlatformSettings,
  updateWithdrawalStatus,
  type AdminBooking,
  type AdminCustomer,
  type Dispute,
  type DisputeResolution,
  type PlatformSettings,
  type PlatformStats,
  type WithdrawalRequest,
} from "@/services/firebase/admin";

export interface BookingFilters {
  status?: string;
  startDate?: Date;
  endDate?: Date;
  service?: string;
}

interface AdminStore {
  stats: PlatformStats | null;
  pendingWorkers: WorkerProfile[];
  allWorkers: WorkerProfile[];
  allCustomers: AdminCustomer[];
  allBookings: AdminBooking[];
  disputes: Dispute[];
  withdrawalRequests: WithdrawalRequest[];
  settings: PlatformSettings | null;
  isLoading: boolean;
  error: string | null;

  fetchStats: () => Promise<void>;
  fetchPendingWorkers: () => Promise<void>;
  fetchAllWorkers: () => Promise<void>;
  fetchAllCustomers: () => Promise<void>;
  fetchAllBookings: (filters?: BookingFilters) => Promise<void>;
  fetchDisputes: () => Promise<void>;
  fetchWithdrawalRequests: () => Promise<void>;
  fetchSettings: () => Promise<void>;

  approveWorker: (workerId: string) => Promise<void>;
  rejectWorker: (workerId: string, reason: string) => Promise<void>;
  addWorkerNotes: (workerId: string, notes: string) => Promise<void>;
  suspendWorker: (workerId: string) => Promise<void>;
  suspendCustomer: (customerId: string) => Promise<void>;

  resolveDispute: (disputeId: string, resolution: DisputeResolution) => Promise<void>;
  processWithdrawal: (withdrawalId: string, status: string, transactionId?: string) => Promise<void>;

  updateSettings: (settings: Partial<PlatformSettings>) => Promise<void>;
}

function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export const useAdminStore = create<AdminStore>((set, get) => ({
  stats: null,
  pendingWorkers: [],
  allWorkers: [],
  allCustomers: [],
  allBookings: [],
  disputes: [],
  withdrawalRequests: [],
  settings: null,
  isLoading: false,
  error: null,

  fetchStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const stats = await getPlatformStats();
      set({ stats, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: toErrorMessage(error, "Failed to fetch stats") });
    }
  },

  fetchPendingWorkers: async () => {
    set({ isLoading: true, error: null });
    try {
      const rows = await getPendingWorkers();
      set({ pendingWorkers: rows, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: toErrorMessage(error, "Failed to fetch pending workers") });
    }
  },

  fetchAllWorkers: async () => {
    set({ isLoading: true, error: null });
    try {
      const rows = await getAllWorkers();
      set({ allWorkers: rows, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: toErrorMessage(error, "Failed to fetch workers") });
    }
  },

  fetchAllCustomers: async () => {
    set({ isLoading: true, error: null });
    try {
      const rows = await getAllCustomers();
      set({ allCustomers: rows, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: toErrorMessage(error, "Failed to fetch customers") });
    }
  },

  fetchAllBookings: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const rows = await getAllBookings(filters);
      set({ allBookings: rows, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: toErrorMessage(error, "Failed to fetch bookings") });
    }
  },

  fetchDisputes: async () => {
    set({ isLoading: true, error: null });
    try {
      const rows = await getDisputes();
      set({ disputes: rows, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: toErrorMessage(error, "Failed to fetch disputes") });
    }
  },

  fetchWithdrawalRequests: async () => {
    set({ isLoading: true, error: null });
    try {
      const rows = await getWithdrawalRequests();
      set({ withdrawalRequests: rows, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: toErrorMessage(error, "Failed to fetch withdrawals") });
    }
  },

  fetchSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const settings = await getPlatformSettings();
      set({ settings, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: toErrorMessage(error, "Failed to fetch settings") });
    }
  },

  approveWorker: async (workerId) => {
    await approveWorker(workerId);
    await get().fetchPendingWorkers();
    await get().fetchAllWorkers();
  },

  rejectWorker: async (workerId, reason) => {
    await rejectWorker(workerId, reason);
    await get().fetchPendingWorkers();
    await get().fetchAllWorkers();
  },

  addWorkerNotes: async (workerId, notes) => {
    await addWorkerVerificationNotes(workerId, notes);
    await get().fetchPendingWorkers();
  },

  suspendWorker: async (workerId) => {
    await suspendWorker(workerId);
    await get().fetchAllWorkers();
  },

  suspendCustomer: async (customerId) => {
    await suspendCustomer(customerId);
    await get().fetchAllCustomers();
  },

  resolveDispute: async (disputeId, resolution) => {
    await resolveDispute(disputeId, resolution);
    await get().fetchDisputes();
  },

  processWithdrawal: async (withdrawalId, status, transactionId) => {
    await updateWithdrawalStatus(withdrawalId, status, transactionId);
    await get().fetchWithdrawalRequests();
  },

  updateSettings: async (settings) => {
    await updatePlatformSettings(settings);
    await get().fetchSettings();
  },
}));

