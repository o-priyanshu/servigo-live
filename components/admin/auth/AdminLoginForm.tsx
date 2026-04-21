"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  async function createAdminSession() {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Authentication state not found. Please try again.");
    }

    const idToken = await user.getIdToken(true);
    const response = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(String((data as { error?: string })?.error ?? "Login failed"));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      await createAdminSession();
      router.replace("/admin/dashboard");
      router.refresh();
    } catch (err) {
      await signOut(auth).catch(() => undefined);
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    if (googleLoading || loading) return;

    setGoogleLoading(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      await signInWithPopup(auth, provider);
      await createAdminSession();

      router.replace("/admin/dashboard");
      router.refresh();
    } catch (err) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "auth/popup-closed-by-user"
      ) {
        return;
      }
      await signOut(auth).catch(() => undefined);
      setError(err instanceof Error ? err.message : "Google login failed");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <section className="w-full max-w-md border border-zinc-800 bg-zinc-950/80 p-6 shadow-2xl">
      <div className="mb-6 flex items-center gap-3 border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200">
        <ShieldAlert size={16} />
        <p className="text-xs leading-relaxed">
          Authorized personnel only. All administrative actions are monitored and logged for compliance.
        </p>
      </div>

      <h1 className="text-2xl font-semibold text-zinc-100">Admin Control Login</h1>
      <p className="mt-1 text-sm text-zinc-400">Role-restricted access for platform safety operations.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <button
          type="button"
          onClick={() => void handleGoogleSignIn()}
          disabled={googleLoading || loading}
          className="flex h-10 w-full items-center justify-center gap-2 border border-zinc-700 bg-zinc-900 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 disabled:opacity-60"
        >
          <GoogleIcon />
          {googleLoading ? "Verifying Google..." : "Continue with Google"}
        </button>

        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="text-xs uppercase tracking-[0.12em] text-zinc-500">or</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        <label className="block text-sm text-zinc-300">
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            className="mt-1 h-10 w-full border border-zinc-700 bg-zinc-900 px-3 text-zinc-100 outline-none focus:border-emerald-500"
            required
          />
        </label>
        <label className="block text-sm text-zinc-300">
          Password
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            className="mt-1 h-10 w-full border border-zinc-700 bg-zinc-900 px-3 text-zinc-100 outline-none focus:border-emerald-500"
            required
          />
        </label>

        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="h-10 w-full bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading ? "Verifying..." : "Enter Admin Panel"}
        </button>
      </form>
    </section>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
