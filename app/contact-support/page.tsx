import Link from "next/link";
import { LifeBuoy } from "lucide-react";

export default function ContactSupportPage() {
  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-3xl px-4 py-12 sm:px-6">
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
          <LifeBuoy size={18} />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-foreground">Contact Support</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Need help with bookings, payments, or account issues? Reach us at{" "}
          <a href="mailto:support@servigo.in" className="font-medium text-foreground underline">
            support@servigo.in
          </a>
          .
        </p>
        <div className="mt-6">
          <Link
            href="/provider/dashboard"
            className="inline-flex h-10 items-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
          >
            Back to Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
