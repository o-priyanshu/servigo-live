"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail, Eye, EyeOff } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface AuthFormProps {
  mode: "signin" | "signup" | "verify";
  setMode: (mode: "signin" | "signup" | "verify") => void;
  isLoading: boolean;
  errorMessage: string | null;
  roleIntent: "user" | "provider" | "admin";
  onRoleIntentChange: (role: "user" | "provider" | "admin") => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onGoogleAuth: () => void;
  onForgotPassword?: () => void;
}

export function AuthForm({
  mode,
  setMode,
  isLoading,
  errorMessage,
  roleIntent,
  onRoleIntentChange,
  onSubmit,
  onGoogleAuth,
  onForgotPassword,
}: AuthFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  if (mode === "verify") {
    return (
      <div className="space-y-6 py-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
          <Mail className="h-6 w-6 text-slate-900" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-900">Verify your email</h2>
          <p className="mx-auto max-w-sm text-sm text-slate-500">
            We sent a verification link to your inbox. Verify your account before using bookings,
            chat, and reviews.
          </p>
        </div>

        <Button
          variant="outline"
          className="h-11 w-full rounded-xl border-slate-300 text-sm font-medium"
          onClick={() => setMode("signin")}
        >
          Back to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
          Account Type
        </p>
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => onRoleIntentChange("user")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              roleIntent === "user" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Customer
          </button>
          <button
            type="button"
            onClick={() => onRoleIntentChange("provider")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              roleIntent === "provider" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Provider
          </button>
        </div>
      </div>

      <Button
        variant="outline"
        onClick={onGoogleAuth}
        disabled={isLoading}
        className="h-11 w-full gap-2 rounded-xl border-slate-300 bg-white text-sm font-medium text-slate-900 hover:bg-slate-50"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
        Continue with Google
      </Button>

      <Divider />

      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "signup" && (
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-sm font-medium text-slate-900">
              Full Name
            </Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="John Doe"
              required
              minLength={2}
              maxLength={100}
              className="h-11 rounded-xl border-slate-300 bg-slate-50 px-3 text-base focus-visible:ring-2 focus-visible:ring-slate-300"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium text-slate-900">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            className="h-11 rounded-xl border-slate-300 bg-slate-50 px-3 text-base focus-visible:ring-2 focus-visible:ring-slate-300"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-slate-900">
              Password
            </Label>
            {mode === "signin" && onForgotPassword && (
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
              >
                Forgot password?
              </button>
            )}
          </div>

          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={mode === "signup" ? 8 : undefined}
              placeholder={mode === "signin" ? "Enter your password" : "Min. 8 characters"}
              className="h-11 rounded-xl border-slate-300 bg-slate-50 px-3 pr-10 text-base focus-visible:ring-2 focus-visible:ring-slate-300"
            />

            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {errorMessage}
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading}
          className="h-11 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white hover:bg-slate-800"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Login" : "Create Account"}
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500">
        {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="font-medium text-slate-900 underline underline-offset-4"
        >
          {mode === "signin" ? "Sign up" : "Sign in"}
        </button>
      </p>

      <p className="text-center text-sm text-slate-500">
        Admin access?{" "}
        <Link href="/admin/login" className="font-medium text-slate-900 underline underline-offset-4">
          Admin login
        </Link>
      </p>
    </div>
  );
}

const GoogleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24">
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

const Divider = () => (
  <div className="my-4 flex items-center gap-3">
    <div className="h-px flex-1 bg-slate-200" />
    <span className="text-xs text-slate-500">OR</span>
    <div className="h-px flex-1 bg-slate-200" />
  </div>
);
