export default function BlockedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-slate-900">
            Account Suspended
          </h1>

          <p className="text-sm text-slate-600">
            Your ServiGo account has been temporarily suspended due to a
            policy or verification issue.
          </p>

          <p className="text-sm text-slate-600">
            If you believe this is a mistake, please{" "}
            <a
              href="mailto:support@servigo.com"
              className="font-medium text-slate-900 underline underline-offset-4 hover:text-slate-700"
            >
              contact support
            </a>{" "}
            for review.
          </p>
        </div>

      </section>
    </main>
  )
}