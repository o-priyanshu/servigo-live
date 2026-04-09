"use client";

/**
 * @file context/AuthContext.tsx
 *
 * Client-side auth context.
 * - Firebase Auth state listener for real-time auth changes
 * - Profile data merged from JWT token claims + Firestore
 * - Single unified `user` object exposed to consumers
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { UserRole } from "@/lib/server/constants";
import type { UserProfile } from "@/lib/types";
import { checkWorkerVerificationStatus } from "@/services/firebase/workerAuth";

type FirebaseErrorLike = { code?: string };

// ─── Context Type ─────────────────────────────────────────────────────────────

interface AuthContextType {
  /** Unified user profile — null when unauthenticated or loading */
  user: UserProfile | null;
  /** Raw Firebase Auth user — use only when you need Firebase-specific fields */
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Builds a UserProfile by merging:
 * 1. JWT token claims (role, blocked) — authoritative, matches middleware
 * 2. Firestore document (name, status, isProfileComplete) — profile data
 */
async function buildUserProfile(
  firebaseUser: FirebaseUser
): Promise<UserProfile | null> {
  const nowIso = new Date().toISOString();
  let role: UserRole = "user";
  let isBlocked = false;

  try {
    const tokenResult = await firebaseUser.getIdTokenResult();
    role = (tokenResult.claims.role as UserRole) ?? "user";
    isBlocked = tokenResult.claims.blocked === true;
  } catch (error) {
    console.warn("[AuthContext] Token claim fetch failed, using defaults.");
  }

  try {
    const snap = await getDoc(doc(db, "users", firebaseUser.uid));
    const firestoreData = snap.exists() ? snap.data() : {};

    // Return the combined profile
    return {
      uid: firebaseUser.uid,
      name:
        (firestoreData.name as string) ??
        firebaseUser.displayName ??
        "ServiGo User",
      email: firebaseUser.email ?? "",
      role,
      emailVerified: firebaseUser.emailVerified,
      isBlocked,
      isProfileComplete: Boolean(firestoreData.isProfileComplete),
      createdAt: firestoreData.createdAt ?? nowIso,
      lastLogin: firestoreData.lastLogin ?? nowIso,
    };
  } catch (error) {
    // FIX: If Firestore fails, return basic info instead of null 
    // to prevent the "Login" button from appearing incorrectly.
    console.error("[AuthContext] Firestore fetch failed, using basic profile:", error);
    return {
      uid: firebaseUser.uid,
      name: firebaseUser.displayName ?? "ServiGo User",
      email: firebaseUser.email ?? "",
      role,
      emailVerified: firebaseUser.emailVerified,
      isBlocked,
      isProfileComplete: false,
      createdAt: nowIso,
      lastLogin: nowIso,
    };
  }
}

async function enforceWorkerVerification(
  profile: UserProfile | null,
  firebaseUser: FirebaseUser
): Promise<UserProfile | null> {
  if (!profile || profile.role !== "provider") return profile;

  try {
    const status = await checkWorkerVerificationStatus(firebaseUser.uid);
    if (status === "rejected") {
      await signOut(auth);
      return null;
    }
  } catch (error) {
    console.warn("[AuthContext] Verification check failed:", error);
  }

  return profile;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) {
      setUser(null);
      return;
    }
    try {
      await auth.currentUser.getIdToken(true);
    } catch (error) {
      const firebaseCode = (error as FirebaseErrorLike)?.code;
      if (firebaseCode !== "auth/network-request-failed") {
        throw error;
      }
    }
    const profile = await buildUserProfile(auth.currentUser);
    const safeProfile = await enforceWorkerVerification(profile, auth.currentUser);
    setUser(safeProfile);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      setFirebaseUser(fbUser);

      if (fbUser) {
        const profile = await buildUserProfile(fbUser);
        const safeProfile = await enforceWorkerVerification(profile, fbUser);
        setUser(safeProfile);
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = useCallback(async () => {
    try {
      const res = await fetch("/api/logout", { method: "POST" });
      if (!res.ok) throw new Error("Server logout failed");

      await signOut(auth);
      setUser(null);
      setFirebaseUser(null);
    } catch (error) {
      console.error("[AuthContext] Logout failed:", error);
      throw error;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, firebaseUser, loading, logout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};
