/**
 * @file lib/firebase.ts
 *
 * Firebase CLIENT SDK — browser/client components only.
 * For server-side operations use lib/firebase-admin.ts instead.
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ─── Env Validation ───────────────────────────────────────────────────────────

const requiredEnvVars = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
} as const;

// Only validate on the client side — during SSR these may not be needed
if (typeof window !== "undefined") {
  const missingVars = Object.entries(requiredEnvVars)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required Firebase environment variables: ${missingVars.join(", ")}\n` +
        `Ensure they are set in your .env.local file.`
    );
  }
}

// ─── App ──────────────────────────────────────────────────────────────────────

const firebaseConfig = {
  ...requiredEnvVars,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ─── Exports ──────────────────────────────────────────────────────────────────

export const auth = getAuth(app);
export const db = getFirestore(app);
