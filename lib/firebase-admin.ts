/**
 * @file lib/firebase-admin.ts
 *
 * Firebase Admin SDK singleton initialization for Next.js (Node.js runtime only).
 * Safe for serverless and dev hot reload.
 */

import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

if (process.env.NEXT_RUNTIME === "edge") {
  throw new Error("firebase-admin cannot run in Edge runtime.");
}

type RequiredEnvVar =
  | "FIREBASE_ADMIN_PROJECT_ID"
  | "FIREBASE_ADMIN_CLIENT_EMAIL"
  | "FIREBASE_ADMIN_PRIVATE_KEY";

function getRequiredEnvVar(key: RequiredEnvVar): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. Ensure it is set in .env.local.`
    );
  }
  return value;
}

const APP_NAME = "firebase-admin-app";

type FirebaseAdminGlobal = {
  app?: App;
  auth?: Auth;
  db?: Firestore;
  firestoreSettingsApplied?: boolean;
};

const globalFirebaseAdmin = globalThis as typeof globalThis & {
  __firebaseAdmin?: FirebaseAdminGlobal;
};

function getGlobalCache(): FirebaseAdminGlobal {
  if (!globalFirebaseAdmin.__firebaseAdmin) {
    globalFirebaseAdmin.__firebaseAdmin = {};
  }
  return globalFirebaseAdmin.__firebaseAdmin;
}

function getOrInitializeApp(): App {
  const cache = getGlobalCache();
  if (cache.app) return cache.app;

  const existingApp = getApps().find((a) => a.name === APP_NAME);
  if (existingApp) {
    cache.app = existingApp;
    return existingApp;
  }

  const initializedApp = initializeApp(
    {
      credential: cert({
        projectId: getRequiredEnvVar("FIREBASE_ADMIN_PROJECT_ID"),
        clientEmail: getRequiredEnvVar("FIREBASE_ADMIN_CLIENT_EMAIL"),
        privateKey: getRequiredEnvVar("FIREBASE_ADMIN_PRIVATE_KEY").replace(
          /\\n/g,
          "\n"
        ),
      }),
    },
    APP_NAME
  );

  cache.app = initializedApp;
  return initializedApp;
}

const app = getOrInitializeApp();

export const adminAuth: Auth = (() => {
  const cache = getGlobalCache();
  if (cache.auth) return cache.auth;
  const auth = getAuth(app);
  cache.auth = auth;
  return auth;
})();

function createAdminDb(): Firestore {
  const cache = getGlobalCache();
  if (cache.db) return cache.db;

  const db = getFirestore(app);

  // Firestore settings can only be called once per Firestore instance/process.
  if (!cache.firestoreSettingsApplied) {
    db.settings({ ignoreUndefinedProperties: true });
    cache.firestoreSettingsApplied = true;
  }

  cache.db = db;
  return db;
}

export const adminDb: Firestore = createAdminDb();

export function isFirebaseError(
  error: unknown
): error is { code: string; message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as Record<string, unknown>).code === "string"
  );
}
