import { create } from "zustand";
import {
  getCustomerRatingAggregate,
  getPendingRatings,
  getWorkerRatingAggregate,
  submitRating as submitRatingService,
  type PendingRating,
  type SubmitRatingData,
} from "@/services/firebase/rating";
import type { CustomerRatingData, WorkerRatingData } from "@/services/firebase/types";

interface RatingStore {
  pendingRatings: PendingRating[];
  isLoading: boolean;
  error: string;
  workerRating: WorkerRatingData | null;
  customerRating: CustomerRatingData | null;
  fetchPendingRatings: (userId: string, userType: "customer" | "worker") => Promise<void>;
  submitRating: (data: SubmitRatingData) => Promise<void>;
  getWorkerRating: (workerId: string) => Promise<WorkerRatingData>;
  getCustomerRating: (customerId: string) => Promise<CustomerRatingData>;
}

export const useRatingStore = create<RatingStore>((set) => ({
  pendingRatings: [],
  isLoading: false,
  error: "",
  workerRating: null,
  customerRating: null,
  fetchPendingRatings: async (userId, userType) => {
    set({ isLoading: true, error: "" });
    try {
      const pendingRatings = await getPendingRatings(userId, userType);
      set({ pendingRatings, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to load pending ratings.",
        isLoading: false,
      });
    }
  },
  submitRating: async (data) => {
    set({ isLoading: true, error: "" });
    try {
      await submitRatingService(data);
      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to submit rating.",
        isLoading: false,
      });
      throw error;
    }
  },
  getWorkerRating: async (workerId) => {
    const aggregate = await getWorkerRatingAggregate(workerId);
    set({ workerRating: aggregate });
    return aggregate;
  },
  getCustomerRating: async (customerId) => {
    const aggregate = await getCustomerRatingAggregate(customerId);
    set({ customerRating: aggregate });
    return aggregate;
  },
}));

export const selectPendingRatingByBookingId = (bookingId: string) => (state: RatingStore) =>
  state.pendingRatings.find((item) => item.bookingId === bookingId) ?? null;
