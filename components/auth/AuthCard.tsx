"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthForm } from "./AuthForm";
import { auth } from "@/lib/firebase";
import { sanitizeCallbackUrl } from "@/lib/auth/callback-url";
import {
  checkWorkerVerificationStatus,
  getWorkerProfile,
} from "@/services/firebase/workerAuth";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";

type AuthMode = "signin" | "signup" | "verify";

interface AuthCardProps {
  initialMode?: AuthMode;
  roleIntent?: "user" | "provider";
  callbackUrl?: string;
}

function getOrCreateDeviceId(): string {
  try {
    const existing = window.localStorage.getItem("servigo_device_id");
    if (existing) return existing;
    const generated = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    window.localStorage.setItem("servigo_device_id", generated);
    return generated;
  } catch {
    return `fallback-${Date.now()}`;
  }
}

function getFirebaseErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code: string }).code;
    switch (code) {
      case "auth/invalid-credential":
        return "Invalid email or password.";
      case "auth/email-already-in-use":
        return "An account with this email already exists.";
      case "auth/popup-closed-by-user":
      case "auth/cancelled-popup-request":
        return "Google authentication was canceled.";
      case "auth/too-many-requests":
        return "Too many attempts. Please try again later.";
      case "auth/network-request-failed":
        return "Network error. Please check your connection.";
      default:
        if ("message" in error && typeof (error as { message: unknown }).message === "string") {
          return (error as { message: string }).message;
        }
    }
  }
  return "Authentication failed. Please try again.";
}

async function createAdminSessionWithRetry(user: User): Promise<void> {
  let lastError = "Admin access denied.";
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const idToken = await user.getIdToken(true);
    const adminLoginResponse = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });

    if (adminLoginResponse.ok) return;

    const payload = (await adminLoginResponse.json().catch(() => null)) as { error?: string } | null;
    lastError = payload?.error ?? "Admin access denied.";
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(lastError);
}

export function AuthCard({
  initialMode = "signin",
  roleIntent = "user",
  callbackUrl = "",
}: AuthCardProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedRoleIntent, setSelectedRoleIntent] = useState<"user" | "provider">(roleIntent);
  const router = useRouter();

  const safeCallbackUrl = useMemo(() => sanitizeCallbackUrl(callbackUrl), [callbackUrl]);

  const deviceId = useMemo(() => {
    if (typeof window === "undefined") return null;
    return getOrCreateDeviceId();
  }, []);

  const bootstrapUser = useCallback(
    async (user: User, fullName?: string) => {
      const idToken = await user.getIdToken(true);
      const provider = user.providerData[0]?.providerId ?? "password";

      const res = await fetch("/api/auth/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          fullName,
          provider,
          roleIntent: selectedRoleIntent,
          ...(deviceId && { deviceId }),
        }),
      });

      if (res.status === 403) {
        await signOut(auth);
        throw new Error("Your account has been suspended. Please contact support.");
      }
      if (!res.ok) {
        throw new Error("Failed to initialize your account. Please try again.");
      }

      return res.json() as Promise<{
        status: string;
        emailVerified: boolean;
        role: string;
        isProfileComplete: boolean;
      }>;
    },
    [deviceId, selectedRoleIntent]
  );

  const syncSession = useCallback(async (user: User) => {
    const idToken = await user.getIdToken(true);

    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });

    if (res.status === 403) {
      await signOut(auth);
      throw new Error("Your account has been suspended. Please contact support.");
    }
    if (!res.ok) {
      throw new Error("Failed to create a secure session. Please try again.");
    }
  }, []);

  const navigatePostAuth = useCallback(
    async (isProfileComplete: boolean, role: string, uid: string, user?: User) => {
      if (role === "admin") {
        const activeUser = user ?? auth.currentUser;
        if (!activeUser) {
          throw new Error("Admin session could not be created.");
        }
        await createAdminSessionWithRetry(activeUser);
        router.push("/admin/dashboard");
        return;
      }

      const isProvider = role === "provider";

      if (isProvider) {
        const workerProfile = await getWorkerProfile(uid);
        if (workerProfile) {
          const verificationStatus = await checkWorkerVerificationStatus(uid);
          if (verificationStatus === "rejected") {
            await signOut(auth);
            throw new Error("Your verification was rejected. Please contact support.");
          }
          if (verificationStatus === "pending") {
            router.push("/provider/pending-verification");
            return;
          }
        }
      }

      if (!isProfileComplete) {
        router.push(isProvider ? "/provider/register" : "/onboarding");
        return;
      }
      if (safeCallbackUrl) {
        router.push(safeCallbackUrl);
        return;
      }
      router.push(isProvider ? "/provider/dashboard" : "/dashboard");
    },
    [router, safeCallbackUrl]
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const fullName = String(formData.get("fullName") ?? "").trim();

    try {
      if (mode === "signin") {
        const { user } = await signInWithEmailAndPassword(auth, email, password);
        await user.reload();

        if (!user.emailVerified) {
          await signOut(auth);
          setMode("verify");
          return;
        }

        const bootstrapResult = await bootstrapUser(user);
        await syncSession(user);
        await navigatePostAuth(bootstrapResult.isProfileComplete, bootstrapResult.role, user.uid, user);
        return;
      }

      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName: fullName });
      await sendEmailVerification(user);
      await bootstrapUser(user, fullName);
      await signOut(auth);
      setMode("verify");
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes("suspended")) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(getFirebaseErrorMessage(error));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      const { user } = await signInWithPopup(auth, provider);
      const bootstrapResult = await bootstrapUser(user, user.displayName ?? undefined);
      await syncSession(user);
      await navigatePostAuth(bootstrapResult.isProfileComplete, bootstrapResult.role, user.uid, user);
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: string }).code === "auth/popup-closed-by-user"
      ) {
        return;
      }
      setErrorMessage(getFirebaseErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[450px] transition-all duration-300 ease-in-out">
      <AuthForm
        mode={mode}
        setMode={setMode}
        isLoading={isLoading}
        errorMessage={errorMessage}
        roleIntent={selectedRoleIntent}
        onRoleIntentChange={setSelectedRoleIntent}
        onSubmit={handleSubmit}
        onGoogleAuth={handleGoogleAuth}
      />
    </div>
  );
}
