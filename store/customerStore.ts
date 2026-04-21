// store/customerStore.ts
// REMOVED "use client" — Zustand stores work in both client and server contexts

import { auth } from "@/lib/firebase";
import {
  addToFavorites as addToFavoritesService,
  cancelBooking as cancelBookingService,
  completeBooking as completeBookingService,
  getActiveBooking as getActiveBookingService,
  getBookingById,
  getCustomerBookings as getCustomerBookingsService,
  getFavorites as getFavoritesService,
  getNotifications as getNotificationsService,
  getWorkersNearby,
  markNotificationRead as markNotificationReadService,
  removeFromFavorites as removeFromFavoritesService,
  subscribeToNotifications as subscribeToNotificationsService,
} from "@/services/firebase";
import type {
  Booking,
  LocationSelection,
  Notification,
  Worker,
} from "@/services/firebase/types";
import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

// ─── Constants ────────────────────────────────────────────────────────────────
// ─── Types ────────────────────────────────────────────────────────────────────
interface CustomerStore {
  // Location
  selectedLocation: LocationSelection | null;

  // Workers
  isLoadingWorkers: boolean;
  nearbyWorkers: Worker[];
  workersError: string;

  // Bookings
  activeBooking: Booking | null;
  bookingInProgress: Partial<Booking> | null;
  isLoadingBooking: boolean;       // FIX: was missing
  bookingError: string;

  // Past bookings
  pastBookings: Booking[];
  isLoadingPastBookings: boolean;  // FIX: was missing
  pastBookingsError: string;       // FIX: was missing

  // Favorites
  favorites: Worker[];
  isLoadingFavorites: boolean;
  favoritesError: string;          // FIX: was missing

  // Notifications
  notifications: Notification[];
  isLoadingNotifications: boolean;
  notificationsError: string;      // FIX: was missing

  // Actions — Location
  setSelectedLocation: (location: CustomerStore["selectedLocation"]) => void;

  // Actions — Workers
  fetchNearbyWorkers: (
    lat: number,
    lng: number,
    service?: string,
    options?: {
      radiusKm?: number;
      minRating?: number;
      gender?: "male" | "female" | "any";
      availableOnly?: boolean;
    }
  ) => Promise<void>;

  // Actions — Booking
  setBookingInProgress: (data: Partial<Booking>) => void;
  clearBookingInProgress: () => void;
  createBooking: (bookingData: Omit<Booking, "id" | "createdAt">) => Promise<string>;
  fetchActiveBooking: () => Promise<void>;
  cancelActiveBooking: (reason?: string) => Promise<void>;
  completeBooking: (bookingId: string, rating: number, review: string) => Promise<void>;

  // Actions — Favorites
  addToFavorites: (workerId: string) => Promise<void>;
  removeFromFavorites: (workerId: string) => Promise<void>;
  fetchFavorites: () => Promise<void>;

  // Actions — Past Bookings
  fetchPastBookings: () => Promise<void>;

  // Actions — Notifications
  fetchNotifications: () => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  subscribeToNotifications: () => (() => void);
}

let customerNotificationsUnsubscribe: (() => void) | null = null;

// ─── SSR-safe storage fallback ────────────────────────────────────────────────
const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

// ─── Helper ───────────────────────────────────────────────────────────────────
function getCurrentCustomerId(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error("You must be signed in to continue.");
  }
  return uid;
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const useCustomerStore = create<CustomerStore>()(
  persist(
    (set, get) => ({
      // ── Initial State ──────────────────────────────────────────────────────
      selectedLocation: null,

      isLoadingWorkers: false,
      nearbyWorkers: [],
      workersError: "",

      activeBooking: null,
      bookingInProgress: null,
      isLoadingBooking: false,
      bookingError: "",

      pastBookings: [],
      isLoadingPastBookings: false,
      pastBookingsError: "",

      favorites: [],
      isLoadingFavorites: false,
      favoritesError: "",

      notifications: [],
      isLoadingNotifications: false,
      notificationsError: "",

      // ── Location ───────────────────────────────────────────────────────────
      setSelectedLocation: (location) => {
        set({ selectedLocation: location });
      },

      // ── Workers ────────────────────────────────────────────────────────────
      fetchNearbyWorkers: async (lat, lng, service, options) => {
	        set({ isLoadingWorkers: true, workersError: "" });
	        try {
	          const nearby = await getWorkersNearby(lat, lng, options?.radiusKm ?? 10, {
	            service,
	            gender: options?.gender ?? "any",
	            minRating: options?.minRating,
	            availableOnly: options?.availableOnly,
	          });

	          set({ nearbyWorkers: nearby, isLoadingWorkers: false });
	        } catch (error: unknown) {
          set({
            isLoadingWorkers: false,
            workersError:
              error instanceof Error
                ? error.message
                : "Failed to load nearby workers.",
          });
        }
      },

      // ── Booking Progress ───────────────────────────────────────────────────
	      setBookingInProgress: (data) => {
	        set((state) => {
	          const current = state.bookingInProgress ?? {};
	          const next = {
	            ...current,
	            ...data,
	          };
	          const keys = Object.keys(next) as Array<keyof typeof next>;
	          const changed = keys.some((key) => current[key] !== next[key]);
	          if (!changed) return state;
	          return { bookingInProgress: next };
	        });
	      },

      clearBookingInProgress: () => {
        set({ bookingInProgress: null, bookingError: "" });
      },

      // ── Create Booking ─────────────────────────────────────────────────────
      createBooking: async (bookingData) => {
        set({ isLoadingBooking: true, bookingError: "" });
        try {
          const customerId = bookingData.customerId || getCurrentCustomerId();

          // FIX Bug 1: only include fields valid at booking creation time.
          // Do NOT forward cancellationReason/Charge/updatedAt/completedAt —
          // those are set by the backend at the appropriate lifecycle stage.
          const payload: Omit<Booking, "id" | "createdAt" | "status"> = {
            customerId,
            providerId: bookingData.providerId,
            serviceCategory: bookingData.serviceCategory,
            scheduledAt: bookingData.scheduledAt,
            address: bookingData.address,
            amount: bookingData.amount,
            safetyShield: bookingData.safetyShield === true,
            payment:
              bookingData.payment?.status === "held" ||
              bookingData.payment?.status === "captured" ||
              bookingData.payment?.status === "refunded"
                ? bookingData.payment
                : {
                    status: "held",
                    holdAmount: bookingData.amount,
                  },
            jobPhotos: bookingData.jobPhotos ?? [],
          };

          const response = await fetch("/api/bookings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(
              typeof data?.error === "string" ? data.error : "Failed to create booking."
            );
          }
          const bookingId = String(data?.id ?? "");
          if (!bookingId) {
            throw new Error("Booking was created but no booking id was returned.");
          }
          const created = await getBookingById(bookingId);
          set({
            activeBooking: created,
            bookingInProgress: null,
            isLoadingBooking: false,
          });
          return bookingId;
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : "Failed to create booking.";
          set({ bookingError: message, isLoadingBooking: false });
          throw error;
        }
      },

      // ── Active Booking ─────────────────────────────────────────────────────
      fetchActiveBooking: async () => {
        set({ isLoadingBooking: true, bookingError: "" });
        try {
          const customerId = getCurrentCustomerId();
          const booking = await getActiveBookingService(customerId);
          set({ activeBooking: booking, isLoadingBooking: false });
        } catch (error: unknown) {
          set({
            activeBooking: null,
            isLoadingBooking: false,
            bookingError:
              error instanceof Error
                ? error.message
                : "Failed to fetch active booking.",
          });
        }
      },

      // FIX Bug 2: added error handling + loading state
      cancelActiveBooking: async (reason) => {
        const active = get().activeBooking;
        if (!active) return;
        set({ isLoadingBooking: true, bookingError: "" });
        try {
          await cancelBookingService(active.id, reason);
          set({ activeBooking: null, isLoadingBooking: false });
        } catch (error: unknown) {
          set({
            isLoadingBooking: false,
            bookingError:
              error instanceof Error
                ? error.message
                : "Failed to cancel booking.",
          });
          throw error;
        }
      },

      // FIX Bug 3: added error handling + loading state
      completeBooking: async (bookingId, rating, review) => {
        set({ isLoadingBooking: true, bookingError: "" });
        try {
          await completeBookingService(bookingId, rating, review);
          set((state) => ({
            activeBooking:
              state.activeBooking?.id === bookingId
                ? null
                : state.activeBooking,
            isLoadingBooking: false,
          }));
        } catch (error: unknown) {
          set({
            isLoadingBooking: false,
            bookingError:
              error instanceof Error
                ? error.message
                : "Failed to complete booking.",
          });
          throw error;
        }
      },

      // ── Favorites ──────────────────────────────────────────────────────────
      addToFavorites: async (workerId) => {
        set({ favoritesError: "" });
        try {
          const customerId = getCurrentCustomerId();
          await addToFavoritesService(customerId, workerId);
          await get().fetchFavorites();
        } catch (error: unknown) {
          set({
            favoritesError:
              error instanceof Error
                ? error.message
                : "Failed to add to favorites.",
          });
          throw error;
        }
      },

      removeFromFavorites: async (workerId) => {
        set({ favoritesError: "" });
        try {
          const customerId = getCurrentCustomerId();
          await removeFromFavoritesService(customerId, workerId);
          // Optimistic update — no refetch needed
          set((state) => ({
            favorites: state.favorites.filter((w) => w.id !== workerId),
          }));
        } catch (error: unknown) {
          set({
            favoritesError:
              error instanceof Error
                ? error.message
                : "Failed to remove from favorites.",
          });
          throw error;
        }
      },

      // FIX Bug 4: error state now set in catch
      fetchFavorites: async () => {
        set({ isLoadingFavorites: true, favoritesError: "" });
        try {
          const customerId = getCurrentCustomerId();
          const favorites = await getFavoritesService(customerId);
          set({ favorites, isLoadingFavorites: false });
        } catch (error: unknown) {
          set({
            favorites: [],
            isLoadingFavorites: false,
            favoritesError:
              error instanceof Error
                ? error.message
                : "Failed to load favorites.",
          });
        }
      },

      // FIX Bug 4 + added loading/error state
      fetchPastBookings: async () => {
        set({ isLoadingPastBookings: true, pastBookingsError: "" });
        try {
          const customerId = getCurrentCustomerId();
          const bookings = await getCustomerBookingsService(customerId, [
            "completed",
            "cancelled",
          ]);
          set({ pastBookings: bookings, isLoadingPastBookings: false });
        } catch (error: unknown) {
          set({
            pastBookings: [],
            isLoadingPastBookings: false,
            pastBookingsError:
              error instanceof Error
                ? error.message
                : "Failed to load past bookings.",
          });
        }
      },

      // ── Notifications ──────────────────────────────────────────────────────
      fetchNotifications: async () => {
        set({ isLoadingNotifications: true, notificationsError: "" });
        try {
          const customerId = getCurrentCustomerId();
          const notifications = await getNotificationsService(customerId);
          set({ notifications, isLoadingNotifications: false });
        } catch (error: unknown) {
          set({
            notifications: [],
            isLoadingNotifications: false,
            notificationsError:
              error instanceof Error
                ? error.message
                : "Failed to load notifications.",
          });
        }
      },

      markNotificationRead: async (notificationId) => {
        // Optimistic update first
        set((state) => ({
          notifications: state.notifications.map((item) =>
            item.id === notificationId ? { ...item, read: true } : item
          ),
        }));
        try {
          await markNotificationReadService(notificationId);
        } catch {
          // Rollback optimistic update on failure
          set((state) => ({
            notifications: state.notifications.map((item) =>
              item.id === notificationId ? { ...item, read: false } : item
            ),
          }));
        }
      },

      subscribeToNotifications: () => {
        if (customerNotificationsUnsubscribe) {
          customerNotificationsUnsubscribe();
          customerNotificationsUnsubscribe = null;
        }

        const customerId = getCurrentCustomerId();
        customerNotificationsUnsubscribe = subscribeToNotificationsService(
          customerId,
          (notification) => {
            set((state) => {
              const existing = state.notifications.find(
                (item) => item.id === notification.id
              );
              if (existing) {
                return {
                  notifications: state.notifications
                    .map((item) =>
                      item.id === notification.id ? notification : item
                    )
                    .sort((a, b) => {
                      const ta = new Date(a.createdAt ?? 0).getTime();
                      const tb = new Date(b.createdAt ?? 0).getTime();
                      if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
                      return tb - ta;
                    }),
                };
              }

              return {
                notifications: [notification, ...state.notifications].sort(
                  (a, b) => {
                    const ta = new Date(a.createdAt ?? 0).getTime();
                    const tb = new Date(b.createdAt ?? 0).getTime();
                    if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
                    return tb - ta;
                  }
                ),
              };
            });
          }
        );

        return () => {
          if (customerNotificationsUnsubscribe) {
            customerNotificationsUnsubscribe();
            customerNotificationsUnsubscribe = null;
          }
        };
      },
    }),

    // ── Persistence Config ───────────────────────────────────────────────────
    {
      name: "servigo:customer-store",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage
      ),
      // Only persist what's needed across page refreshes
      partialize: (state) => ({
        selectedLocation: state.selectedLocation,
        bookingInProgress: state.bookingInProgress,
      }),
    }
  )
);
