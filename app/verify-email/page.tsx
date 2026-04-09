// verify-email/page.tsx
"use client"

import { Suspense } from "react"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { sendEmailVerification } from "firebase/auth"
import { auth } from "@/lib/firebase"

 function VerifyEmailContent() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams?.get("email") ?? null

  const resendVerification = async () => {
    if (!auth.currentUser) {
      setMessage("Please sign in again to resend the verification email.")
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      await sendEmailVerification(auth.currentUser)
      setMessage("Verification email sent. Please check your inbox.")
    } catch {
      setMessage("Could not resend verification email.")
    } finally {
      setLoading(false)
    }
  }

  const goToLogin = () => router.push("/auth/login")

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Verify your email</h1>
        <p className="mt-3 text-sm text-slate-600">
          A verification link was sent{email ? ` to ${email}` : ""}. You must verify before booking, chat, and review access.
        </p>
        {message && <p className="mt-4 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}
        <div className="mt-6 space-y-3">
          <button
            onClick={resendVerification}
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? "Sending..." : "Resend verification email"}
          </button>
          <button
            onClick={goToLogin}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700"
          >
            Back to login
          </button>
        </div>
      </section>
    </main>
  )
  
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  )
}
