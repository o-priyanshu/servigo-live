/**
 * @file store/paymentStore.ts
 * Razorpay payment store — integrates with existing booking flow.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Payment } from "@/lib/types";

// ─── Razorpay window type ─────────────────────────────────────────────────────

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  theme: { color: string };
  modal: {
    ondismiss: () => void;
  };
}

interface RazorpayInstance {
  open: () => void;
}

type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance;

// ─── Store Interface ──────────────────────────────────────────────────────────

interface PaymentStore {
  currentPayment: {
    orderId: string;
    amount: number;
    bookingId: string;
    status: "created" | "processing" | "paid" | "failed";
  } | null;
  paymentHistory: Payment[];
  isLoading: boolean;
  error: string;

  initiatePayment: (
    bookingId: string,
    amount: number,
    customerId: string,
    workerId: string
  ) => Promise<{ orderId: string; amount: number; keyId: string }>;

  verifyPayment: (data: {
    orderId: string;
    paymentId: string;
    signature: string;
    bookingId: string;
  }) => Promise<boolean>;

  openRazorpayCheckout: (params: {
    bookingId: string;
    amount: number;
    customerId: string;
    workerId: string;
    userName: string;
    userEmail: string;
    userPhone: string;
    serviceDescription: string;
    onSuccess: (paymentId: string) => void;
    onFailure: (error: string) => void;
  }) => Promise<void>;

  fetchPaymentHistory: (customerId: string) => Promise<void>;
  clearPayment: () => void;
}

// ─── Helper: load Razorpay script once ───────────────────────────────────────

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as unknown as Record<string, unknown>).Razorpay) {
      resolve();
      return;
    }
    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Razorpay script failed to load"))
      );
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Razorpay script failed to load"));
    document.body.appendChild(script);
  });
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePaymentStore = create<PaymentStore>()(
  persist(
    (set, get) => ({
      currentPayment: null,
      paymentHistory: [],
      isLoading: false,
      error: "",

      // ── Initiate Payment ────────────────────────────────────────────────────
      initiatePayment: async (bookingId, amount, customerId, workerId) => {
        set({ isLoading: true, error: "" });
        try {
          // Fix: corrected the typo — was /api/payments/create-orde
          const res = await fetch("/api/payments/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingId, amount, customerId, workerId }),
          });

          if (!res.ok) {
            const err = (await res.json()) as { error?: string };
            throw new Error(err.error ?? "Failed to create payment order");
          }

          const data = (await res.json()) as {
            orderId: string;
            amount: number;
            keyId: string;
          };

          set({
            currentPayment: {
              orderId: data.orderId,
              amount: data.amount,
              bookingId,
              status: "created",
            },
            isLoading: false,
          });

          return data;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Payment initiation failed";
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      // ── Verify Payment ──────────────────────────────────────────────────────
      verifyPayment: async ({ orderId, paymentId, signature, bookingId }) => {
        set({ isLoading: true, error: "" });
        try {
          const res = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId, paymentId, signature, bookingId }),
          });

          if (!res.ok) {
            set({ isLoading: false });
            return false;
          }

          const data = (await res.json()) as {
            verified: boolean;
            error?: string;
          };

          if (data.verified) {
            set((state) => ({
              currentPayment: state.currentPayment
                ? { ...state.currentPayment, status: "paid" }
                : null,
              isLoading: false,
            }));
          } else {
            set((state) => ({
              currentPayment: state.currentPayment
                ? { ...state.currentPayment, status: "failed" }
                : null,
              isLoading: false,
              error: data.error ?? "Payment verification failed",
            }));
          }

          return data.verified;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Verification failed";
          set({ error: message, isLoading: false });
          return false;
        }
      },

      // ── Open Razorpay Checkout ──────────────────────────────────────────────
      openRazorpayCheckout: async ({
        bookingId,
        amount,
        customerId,
        workerId,
        userName,
        userEmail,
        userPhone,
        serviceDescription,
        onSuccess,
        onFailure,
      }) => {
        if (typeof window === "undefined") {
          onFailure("Payment is only available in the browser.");
          return;
        }

        set({ isLoading: true, error: "" });

        try {
          // 1. Create order first
          const { orderId, keyId } = await get().initiatePayment(
            bookingId,
            amount,
            customerId,
            workerId
          );

          // 2. Load Razorpay script if not already loaded
          await loadRazorpayScript();

          const RazorpayClass = (
            window as unknown as Record<string, unknown>
          ).Razorpay as RazorpayConstructor;

          // 3. Open checkout
          const rzp = new RazorpayClass({
            key: keyId,
            amount: amount * 100, // Razorpay expects paise
            currency: "INR",
            name: "ServiGo",
            description: serviceDescription,
            order_id: orderId,
            handler: async (response: RazorpayResponse) => {
              set((state) => ({
                currentPayment: state.currentPayment
                  ? { ...state.currentPayment, status: "processing" }
                  : null,
              }));

              const verified = await get().verifyPayment({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                bookingId,
              });

              if (verified) {
                onSuccess(response.razorpay_payment_id);
              } else {
                set((state) => ({
                  currentPayment: state.currentPayment
                    ? { ...state.currentPayment, status: "failed" }
                    : null,
                }));
                onFailure("Payment verification failed. Please contact support.");
              }
            },
            prefill: {
              name: userName,
              email: userEmail,
              contact: userPhone,
            },
            theme: { color: "#10B981" },
            modal: {
              ondismiss: () => {
                set({ isLoading: false });
                onFailure("Payment cancelled by user.");
              },
            },
          });

          rzp.open();
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Payment failed to open";
          set({ error: message, isLoading: false });
          onFailure(message);
        }
      },

      // ── Fetch Payment History ───────────────────────────────────────────────
      fetchPaymentHistory: async (customerId: string) => {
        set({ isLoading: true, error: "" });
        try {
          const res = await fetch(
            `/api/payments/history?customerId=${customerId}`
          );
          if (!res.ok) throw new Error("Failed to fetch payment history");
          const data = (await res.json()) as { payments: Payment[] };
          set({ paymentHistory: data.payments ?? [], isLoading: false });
        } catch (error) {
          set({
            isLoading: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to fetch payment history",
          });
        }
      },

      // ── Clear Payment ───────────────────────────────────────────────────────
      clearPayment: () => {
        set({ currentPayment: null, error: "" });
      },
    }),
    {
      name: "servigo:payment-store",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : {
              getItem: () => null,
              setItem: () => undefined,
              removeItem: () => undefined,
            }
      ),
      // Only persist the current in-progress payment so user
      // can recover if they accidentally close the tab mid-flow
      partialize: (state) => ({
        currentPayment: state.currentPayment,
      }),
    }
  )
);